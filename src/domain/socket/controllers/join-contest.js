"use strict";
const { tableInitValidator } = require("../validators")
const { customError } = require("../../shared/index");
const { ERROR_CODES, GAME } = require("../../constants");
const commonFunctions = require("./common-functions");
const { socketEvents } = require("../events");
const { Rummy } = require("../../rummy/base");
const loggerError = require('../../../utils/logger');
const { distroyTable, getTable, getTableWaitingTable, setTable, getTableState, getUserByTable, getTableForMatch } = require("../../rummy/table-manager");
//const {emitInRoom} = require("../../socket/controllers/table-init");
const { gameService } = require("../../game");
//const loggerError = require('../../../utils/logger')
const { getRabbitMQbytableID } = require("../../../infra/Redis/redis-key")
const rabbitMQChannel = require("../../user/rabbitmq.channel")
const { XFac } = require("../../xfac/xfac");

const GAME_START_TIMER = 5000;
const { TRY_SEARCHING_AGAIN, SUCCESS, GAME_FINISED, ERROR, ERROR_GAME } = require("../../../domain/constants/error-codes")
const { TRY_SEARCHING_AGAIN_MESSAGE, ERROR_MESSAGE_EXIT, SUCCESS_MESSAGE, GAME_FINISED_MESSAGE, ERROR_MESSAGE } = require("../../../domain/constants/error-message");

const { PLAYER_STATE, GAME_STATES, ROOM_MODE, GAME_MODE, GAME_TYPES } = require("../../constants/game-type");
const intializeRabbitMQ = require("../../../interfaces/rabbitMQ-server");
let MODE = 0;
const repo = require("../../game/repo");

module.exports = (socketIO, socket) => {
     const parseTableInitResponse = (table) => {
          const response = {
               _id: table._id,
               metaData: table.metaData,
               players: table.players,
               gameState: table.gameState
          }
          return response;
     }
     const emitInRoom = (roomId, eventName, data) => {
          if (socketIO) {
               console.info("emitInRoom event name data " + eventName, roomId, eventName);
               loggerError.gameLog(roomId, "joinContestController" + eventName, data);

               const resp = { status: SUCCESS, data: data, errorMessage: SUCCESS_MESSAGE };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     const JoinGame = async (payload, socketCallback) => {
          var startTimerRunning = true;
          var getStartTime = new Date().getTime();
          //console.log("joinStart payload : ", payload);
          try {

               if (typeof socketCallback != "function") {
                    console.error("onTableInit: socketCallback is not a function");
                    socketCallback = () => { };
               }
               // const cleanBody = tableInitValidator.onTableInitSchema(payload);
               //console.log("\n joinStart 1", cleanBody);
               const { gameId,constestId } = payload;
               loggerError.gameLog(gameId, "On join Event from socket called from user " + socket.name, payload)
               loggerError.Log(gameId, "On join Event from socket called from user " + socket.name, payload)

               let tableid = gameId;
               const player = { userId: socket.userId, name: socket.name || "p1", token: socket.token };
               //console.log(player)
               const table = await getTable(tableid);
               //loggerError.Log(gameId, "Running table data on game join of " , socket.name, table)
               //loggerError.gameLog(gameId, "Search for game table ", JSON.stringify(table))
               //check the status in rabbit mq
               const cacheKey = getRabbitMQbytableID(tableid);
               // ioredis supports the node.js callback style
               let rabbitData = await intializeRabbitMQ.Instance.RedisConnection.hgetall(cacheKey);

               let getTableWaitingTableData = await getTableWaitingTable(tableid)
               //loggerError.Log(gameId, "Data on game join of " , socket.name, getTableWaitingTableData, cacheKey, rabbitData, table)
               //loggerError.gameLog(gameId, 'Table list in join socket', table, '----', getTableWaitingTableData)
               if (table) {
                    let getAccess = await getTableState(tableid)
                    if (getAccess == GAME_STATES.WAITING) {

                         //waiting game state 
                         //joining into the room 
                         const commonRoom = commonFunctions.createRoomIds(table._id);
                         const personalRoom = commonFunctions.createRoomIds(table._id, socket.userId);
                         socket.join(commonRoom);
                         socket.join(personalRoom);
                         loggerError.Log(table._id, "Player entering to the table(waiting) by userID" + socket.userId, table)

                         socketCallback({ status: SUCCESS, data: {}, errorMessage: "game will start" });
                    }
                    else if (getAccess == GAME_STATES.DESTROYED || getAccess == GAME_STATES.FINISHED) {
                         loggerError.Log(gameId, "Table state destroyed on game join", socket.name, getAccess)
                         socketCallback({ status: GAME_FINISED, data: {}, errorMessage: GAME_FINISED_MESSAGE });
                    }
                    else if (getAccess == GAME_STATES.RUNNING) {
                         let getRunningTableData = await getTable(tableid)
                         let response = getRunningTableData.onSyncGame(socket.userId)
                         loggerError.Log(gameId, "Table is running on game join of ", socket.name, response);
                         const commonRoom = commonFunctions.createRoomIds(table._id);
                         const pRoom = commonFunctions.createRoomIds(table._id, player.userId);
                         socket.join(commonRoom);
                         socket.join(pRoom);
                         //emitInRoom(table._id, socketEvents.rummy.gameSync, response);
                         socketCallback({ status: SUCCESS, data: response, errorMessage: "Table is running" });
                    }
                    else {
                         //get waiting table 


                    }
               }
               else if (getTableWaitingTableData != undefined) {

                    const commonRoom = commonFunctions.createRoomIds(getTableWaitingTableData._id);
                    const pRoom = commonFunctions.createRoomIds(getTableWaitingTableData._id, player.userId);
                    socket.join(commonRoom);
                    socket.join(pRoom);
                    const commomclients = socketIO.sockets.adapter.rooms.get(commonRoom);
                    const personalclients = socketIO.sockets.adapter.rooms.get(pRoom);
                    loggerError.gameLog(getTableWaitingTableData._id, 'Socket list on join socket common', commonRoom, commomclients);
                    loggerError.gameLog(getTableWaitingTableData._id, 'Socket list on join socket personal', pRoom, personalclients);
                    loggerError.Log(gameId, "Table is in waiting table means 2 player not in game ", socket.name, getTableWaitingTableData)
                    setTimeout(()=>joinXfacInGame(getTableWaitingTableData, socket.mid), payload.gameServerTimeoutIn - 10000)
                    // joinXfacInGame(getTableWaitingTableData, socket.mid)
                    socketCallback({ status: SUCCESS, data: {}, errorMessage: "Table is waiting list" });

               }

               else if (rabbitData.status == rabbitMQChannel.SENT.toString()) {
                    loggerError.Log(gameId, "Invalid rabbitMQ status", rabbitData.status)
                    socketCallback({ status: TRY_SEARCHING_AGAIN, data: {}, errorMessage: TRY_SEARCHING_AGAIN_MESSAGE });
               }
               else {
                    //check on mongo for game state
                    let checkstateInMongo = await repo.findOne({ gameId: gameId })
                    if (checkstateInMongo) {
                         console.log(checkstateInMongo)
                         if (checkstateInMongo.gameState == GAME_STATES.DESTROYED || checkstateInMongo.gameState == GAME_STATES.FINISHED) {
                              loggerError.gameLog(gameId, "Error while creating room", rabbitData.status)
                              socketCallback({ status: GAME_FINISED, data: {}, errorMessage: GAME_FINISED_MESSAGE });
                         }
                         else {
                              loggerError.gameLog(gameId, "Game is not finised in mongodb", rabbitData.status)
                              socketCallback({ status: GAME_FINISED, data: {}, errorMessage: GAME_FINISED_MESSAGE });
                         }
                    }
                    else {
                         loggerError.gameLog(gameId, "Game is not finised in mongodb", rabbitData.status)
                         //socketCallback({ status: ERROR_GAME, data: {}, errorMessage: ERROR_MESSAGE_EXIT });
                         socketCallback({ status: SUCCESS, data: {}, errorMessage: "Table is waiting list" });
                    }

               }
          } catch (error) {
               console.error(error);
               //loggerError.gameLog(table._id, 'Error in Table init', error);
               socketCallback({ status: 400, errorMessage: error });
          }

     }
     

     const joinXfacInGame = async (table, opponentId) => {
          loggerError.Log(table._id, 'Player wait timeout=>', table)
          if (table.metaData.gameModeX == GAME_MODE.XFAC && !table.isRunning) {
               loggerError.Log(table._id, "Joining xfac in game", table)
               let xfac = new XFac();
               xfac.joinMatch(table, opponentId)
          }

     }
     socket.on(socketEvents.matchMaking.JoinStart, JoinGame);
}
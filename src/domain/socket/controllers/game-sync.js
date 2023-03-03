"use strict";
const { customError } = require("../../shared/index");
const commonFunctions = require("./common-functions");
const { socketEvents } = require("../events");
const { getTable, getTableWaitingTable, isTableExpired } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')
const { ERROR_GAME, NO_OPPONENT_FOUND, GAME_FINISED, ERROR, GAME_WAITING } = require("../../constants/error-codes")
const { GAME_STATES } = require("../../constants/game-type");
const { NO_OPPONENT_FOUND_MESSAGE, GAME_FINISED_MESSAGE, ERROR_MESSAGE, GAME_WAITING_MESSAGE } = require("../../constants/error-message");
const { deleteWaitingList } = require("../../game/service")
const redisStorage = require("../../../interfaces/redisConnection");
const intializeRabbitMQ = require("../../../interfaces/rabbitMQ-server")

module.exports = (socketIO, socket) => {
     const onSyncGame = async (payload, socketCallback) => {
          let runningGame, waitingGame;
          const gameId = payload.tableId || socket.tableId || "";
          loggerError.Log(gameId, "Game sync request come from user " + socket.name, payload);
          try {
               // Case 1- Unable to find the requested table in waiting queue
               if (!gameId) {
                    const err = customError.createCustomError(404, "Missing gameId");
                    loggerError.Log(gameId, "Missing gameId", err);
                    socketCallback({ status: ERROR_GAME, errorMessage: "Missing gameId" });
                    return;
               }

               waitingGame = getTableWaitingTable(gameId);
               if (waitingGame && waitingGame.gameState == GAME_STATES.WAITING) {
                    // Case 2- When table is in waiting state after timeout seconds
                    if (isTableExpired(waitingGame)) {
                         loggerError.gameLog(gameId, "Game is expired on sync deleting it" + waitingGame.players);
                         socketCallback({ status: NO_OPPONENT_FOUND, errorMessage: NO_OPPONENT_FOUND_MESSAGE });
                         await deleteWaitingList(gameId);
                         await intializeRabbitMQ.Instance.Transaction.putNoOpponentFound(socket.mid, waitingGame.contestId)
                         return;
                    }
                    // Case 3- When table is in waiting state before timeout seconds 
                    else {
                         joinRoom(socket, gameId);
                         loggerError.gameLog(gameId, "Game is still in waiting" + waitingGame.players);
                         socketCallback({ status: GAME_WAITING, errorMessage: GAME_WAITING_MESSAGE });
                         return
                    }
               }
               
               runningGame = getTable(gameId);
               loggerError.Log(gameId, "GAME DATA ON GAME SYNC REQUEST=>" + socket.name, runningGame?._id);
               
               // Case 4- Unable to find the requested table in running queue
               if (!runningGame || runningGame == undefined) {
                    const err = customError.createCustomError(404, "Game Not Found");
                    loggerError.Log(gameId, "game not found in running table", err);
                    socketCallback({ status: GAME_FINISED, errorMessage: GAME_FINISED_MESSAGE });
                    return;
               } else if(runningGame?.gameState == GAME_STATES.WAITING) {
                    // Case 4a- When running table is in waiting state after timeout seconds
                    if (isTableExpired(runningGame)) {
                         loggerError.gameLog(gameId, "Game is expired on sync deleting it" + waitingGame.players);
                         socketCallback({ status: NO_OPPONENT_FOUND, errorMessage: NO_OPPONENT_FOUND_MESSAGE });
                         await deleteWaitingList(gameId);
                         await intializeRabbitMQ.Instance.Transaction.putNoOpponentFound(socket.mid, waitingGame.contestId)
                         return;
                    }
                    // Case 4b- When table is in waiting state before timeout seconds 
                    else {
                         joinRoom(socket, gameId);
                         loggerError.gameLog(gameId, "Game is still in waiting" + waitingGame.players);
                         socketCallback({ status: GAME_WAITING, errorMessage: GAME_WAITING_MESSAGE });
                         return
                    }
               }

               // Case 5- Success case when table found successfuly
               joinRoom(socket, gameId)
               let resp = runningGame.onSyncGame(socket.userId);
               loggerError.Log(gameId, "Success on game sync response =>", resp);
               socketCallback({ status: 200, data: resp });
               return;


          } catch (error) {
               console.error('Error in gameSync', gameId, error);
               loggerError.Log(gameId, "Error in gameSync", error, runningGame, waitingGame, gameId);
               socketCallback({ status: ERROR, errorMessage: ERROR_MESSAGE });
          }
     }
     socket.on(socketEvents.rummy.gameSync, onSyncGame);
}

function joinRoom(socket, gameId) {
     loggerError.Log(gameId, "Joining user in socket room ", socket.name);
     const commonRoom = commonFunctions.createRoomIds(gameId);
     const personalRoom = commonFunctions.createRoomIds(gameId, socket.userId);
     socket.join(commonRoom);
     socket.join(personalRoom);
}

// const onSyncGame = async (payload, socketCallback) => {
//      const gameId = payload.tableId || socket.tableId || "";
//      loggerError.Log(gameId, "Game sync request come from user " + socket.name, payload);
//      try {
//           const melds = payload.melds || "";
//           if (!gameId) {
//                const err = customError.createCustomError(404, "Missing gameId");
//                loggerError.gameLog(gameId, "Missing gameId", err);
//                socketCallback({ status: ERROR_GAME, errorMessage: "Missing gameId" });
//                return;
//           }
//           //finding person from running table
//           const gameWaiting = getTableWaitingTable(gameId);
//           if (gameWaiting && gameWaiting.gameState == GAME_STATES.WAITING) {

//                const err = customError.createCustomError(NO_OPPONENT_FOUND, NO_OPPONENT_FOUND_MESSAGE);
//                loggerError.gameLog(gameId, "game with no opponent found" + gameWaiting.players, err);
//                socketCallback({ status: NO_OPPONENT_FOUND, errorMessage: NO_OPPONENT_FOUND_MESSAGE });
//                await deleteWaitingList(gameId);
//                let currentDate = new Date();
//                //await redisStorage.Instance.incNoOpponentCounter(currentDate.toISOString().substring(0, 10), 1);
//                //
//                console.log("======================" + socket.mid)
//                console.log("======================" + gameWaiting.contestId)
//                await intializeRabbitMQ.Instance.Transaction.putNoOpponentFound(socket.mid, gameWaiting.contestId)
//                return;
//           }
//           //finding person from running table
//           const game = getTable(gameId);
//           loggerError.Log(gameId, "GAME DATA ON GAME SYNC REQUEST=>" + socket.name, game?._id);
//           console.error(gameId, "GAME DATA ON GAME SYNC REQUEST=>" + socket.name, game);

//           // console.log("onSyncGame : game object ",game);
//           if (!game || game == undefined) {
//                const err = customError.createCustomError(404, "game obj not found");
//                loggerError.gameLog(gameId, "game not found in running table", err);
//                socketCallback({ status: GAME_FINISED, errorMessage: GAME_FINISED_MESSAGE });
//                return;
//           }
//           if (game) {
//                const commonRoom = commonFunctions.createRoomIds(gameId);
//                const personalRoom = commonFunctions.createRoomIds(gameId, socket.userId);
//                socket.join(commonRoom);
//                socket.join(personalRoom);
//                // console.log("onSyncGame : game object ", game);
//                let resp = game.onSyncGame(socket.userId);
//                loggerError.Log(gameId, "Success on game sync response =>", resp);
//                socketCallback({ status: 200, data: resp });
//                return;
//           }

//      } catch (error) {
//           console.error(error);
//           loggerError.gameLog(gameId, "Table is not created", error);
//           socketCallback({ status: ERROR, errorMessage: ERROR_MESSAGE });
//      }

// }
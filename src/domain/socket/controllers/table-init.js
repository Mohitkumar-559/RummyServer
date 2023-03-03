"use strict";
const { tableInitValidator } = require("../validators")
const { customError } = require("../../shared/index");
const { ERROR_CODES,GAME } = require("../../constants");
const commonFunctions = require("./common-functions");
const { socketEvents } = require("../events");
const { gameService } = require("../../game");
const { Rummy } = require("../../rummy/base");
const { getTable, setTable } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')

let MODE = 0;
module.exports = (socketIO, socket) => {
     const onTableInit = async (payload, socketCallback) => {
          console.log("onTableInit payload : ", payload);
          try {
               if(typeof socketCallback != "function"){
                    console.error("onTableInit: socketCallback is not a function");
                    socketCallback = ()=>{};
               }
               const cleanBody = tableInitValidator.onTableInitSchema(payload);
               console.log("\n onTableInit 1", cleanBody);
               const { gameType, roomMode, playerCount, betValue } = cleanBody;
               //need to discuss about why contestId is always 1
               const contestId = payload.contestId || payload.contestid || "";
               let contest_id = parseInt(contestId);
               //GAME MODE DEFINED GAME
               if(contest_id < 1 ){
                    MODE = GAME.ROOM_MODE.PRACTICE; 
               }
               if(contest_id > 0 ){
                    MODE = GAME.ROOM_MODE.CASH; 
               }
               const player = { userId: socket.userId, name: socket.name || "p1" , token: socket.token};
               ///we  need to check the balance only then we let them enter room
               await commonFunctions.checkUserBalance(socket.userId, betValue); 
               //search the table for the user
               let table = await gameService.onSearchGame(contestId,cleanBody, player);
               let botswitch =true;
               if (!table) {
                    console.info("Not found while searching, so creating new");
                    table = await gameService.onCreateGame(contestId,cleanBody, player);
                    botswitch = false;
               }
               console.info("\n table 1 ", JSON.stringify(table));
               if (!table) {
                    const err = customError.createCustomError(ERROR_CODES.TRY_SEARCHING_AGAIN, "Try Searching Again")
                    return socketCallback({ status: 400, error: err });
               }
               else{
                    //instead of making try it will call the bot player here.
                    if(MODE == 3){
                         //let go for the bot gaming
                              let bottime = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
                              let nn = await new Promise(resolve => setTimeout(resolve, bottime));
                              if(table.players.length<2){
                                   let getBotName = ['Abishek','Jata-sankar','Binay','Rajesh','jeet','vaibhav','venus']
                                   let botnameIndex = Math.floor(Math.random() * getBotName.length);
                                   let bot = { userId: 'bot-player-01', name: getBotName[botnameIndex]};
                                   table = await gameService.onSearchGame(contestId,cleanBody, bot);
                              }
                    }
               }
               //joining into the room 
               const commonRoom = commonFunctions.createRoomIds(table._id);
               const personalRoom = commonFunctions.createRoomIds(table._id, socket.userId);
               socket.join(commonRoom);
               socket.join(personalRoom);
               //emitter function to emit the data to room with status code
               emitInRoom(commonRoom, socketEvents.matchMaking.tableInit, parseTableInitResponse(table));
               if (table.isRunning) {
                    const game = new Rummy(table._id, table.players,emitInRoom, contestId);
                    setTable(game);
                    loggerError.gameLog(table._id, 'Players enter to table', table.players);
                    console.log("\n waiting for card distribution ", player);
                    table.players.forEach(async(player, index) => {
                         console.log("\n player ", player);
                         //balance deduct cannot happen for the practise game
                         if(MODE != 3){
                              const resp =  commonFunctions.deductUserBalance(contestId,player.token,table._id).catch(err => {console.error("onTableInit: deductUserBalance", err)});
                              console.log("\n player resp ", resp);
                         }
                    });
                    // set timeout for the game 
                    await gameService.timeout(10000);
                    game.startGame();
                    table.players.forEach(async(player, index) => {
                         // console.log("\n player ", player);
                         // const resp =  commonFunctions.deductUserBalance(contestId,player.token,table._id).catch(err => {console.error("onTableInit: deductUserBalance", err)});
                         const pRoom = commonFunctions.createRoomIds(table._id, player.userId);
                         //emit the room with player
                         emitInRoom(pRoom, socketEvents.rummy.gameSync, game.eventCards(index));
                    });
               }
          } catch (error) {
               console.error(error);
               loggerError.gameLog(table._id, 'Error in Table init', error);
                    
               socketCallback({ status: 400, error: error });
          }

     }
     const onLeaveRoom = async (payload, socketCallback) => {
          console.log("onLeaveRoom : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               console.log("onLeaveRoom payload ", gameId);
               const resp = await gameService.onLeaveGame(gameId, socket.userId);
               if(resp) {
                    const commonRoom = commonFunctions.createRoomIds(gameId);
                    const personalRoom = commonFunctions.createRoomIds(gameId, socket.userId);
                    socket.leave(commonRoom);
                    socket.leave(personalRoom);
                    loggerError.gameLog(gameId, 'Players leaving to table', table.players);
               } 
               console.log("onLeaveRoom resp ", resp);
               socketCallback({ status: 200, data: {tableId:gameId}});
          } catch (error) {
               console.error(error);
               socketCallback({ status: 400, error: error });
          }
     }
     const emitInRoom = (roomId, eventName, data) => {
          if (socketIO) {
               console.info("emitInRoom event name data ", roomId, eventName);
               loggerError.gameLog(roomId,"emitInRoom event name data ", roomId, eventName);
               
               const resp = { status: 200, data: data };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     const parseTableInitResponse = (table) => {
          const response = {
               _id: table._id,
               metaData: table.metaData,
               players: table.players,
               gameState: table.gameState
          }
          return response;
     }
     const pingpong = (payload,socketCallback) => {
          const milli = payload.ts;
          console.log("pingpong : payload", payload);
          socketCallback({ status: 200, data: { message: "pong", ts: Date.now() } });
     }
     const pingpongAck = (payload,socketCallback) => {
          const milli = payload.ts;
          console.log("pingpong : payload", payload);
          socketCallback({ status: 200, data: { message: "pong", ts: Date.now() } });
     }

     socket.on(socketEvents.matchMaking.tableInit, onTableInit);
     socket.on("leaveRoom", onLeaveRoom);
     socket.on("pingpong", pingpong);
     socket.on("pingpongAck", pingpongAck);
}
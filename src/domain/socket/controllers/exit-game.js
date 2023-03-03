"use strict";
const { customError } = require("../../shared/index");
const { socketEvents } = require("../events");
const { gameService } = require("../../game");
const { getTable } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')
const repo = require("../../game/repo");
const {  GAME_STATES } = require("../../constants/game-type");

module.exports = (socketIO, socket) => {
     const onExitGame = async (payload, socketCallback) => {
          //console.log("onExitGame : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               //console.log("onExitGame payload ", gameId);
               if (!gameId) {
                    const err = customError.createCustomError(404, "Missing gameId");
                    loggerError.gameLog(gameId, "error on finish Game", err);
                    socketCallback({ status: 400, error: err });
               }
               const game = getTable(gameId);
               if (!game) {
                    const err = customError.createCustomError(404, "game obj not found");
                    loggerError.gameLog(gameId, "error on finish Game", err);
                    return socketCallback({ status: 400, error: err });
               }
                let resp = await game.onExitGame(socket.userId);
               //console.log("onExitGame response ", resp);
               if(resp._id){
                    gameService.updateGameOnEnd(resp._id,resp).catch(e=>{console.error(e)});
               }
               socketCallback({ status: 200, data: resp });
               loggerError.gameLog(gameId, 'Player leaving game onExitGame response+', payload," response" ,resp);
               let updatestateInMongo = await repo.findOneUpdate({gameId:gameId},{$set:{gameState:GAME_STATES.FINISHED}})
               emitInRoom(gameId, socketEvents.rummy.gameSync, resp);
          } catch (error) {
               console.error(error);
               loggerError.gameLog(gameId, 'Error', error);
               socketCallback({ status: 400, error: error });
          }
     }
     const onLeaveRoom = async (payload, socketCallback) => {
          //console.log("onLeaveRoom : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               //console.log("onLeaveRoom payload ", gameId);
               loggerError.gameLog(gameId, 'Player leaving game ', payload);
               socketCallback({ status: 200, data: {tableId:gameId}});
          } catch (error) {
               console.error(error);
               loggerError.gameLog(gameId, 'Error', error);
               socketCallback({ status: 400, error: error });
          }

     }
     const emitInRoom = (roomId, eventName, data) => {
          if (socketIO) {
               console.info("emitInRoom event name data ", roomId, eventName);
               loggerError.gameLog(roomId,"exitGameController", roomId, eventName);
               const resp = { status: 200, data: data };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     socket.on(socketEvents.rummy.exitGame, onExitGame);
     // socket.on("leaveRoom", onLeaveRoom);
}
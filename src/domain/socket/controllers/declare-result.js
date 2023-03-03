"use strict";
const { customError } = require("../../shared/index");
const { ERROR_CODES,ERROR_MESSAGE } = require("../../constants");
const { socketEvents } = require("../events");
const { gameService } = require("../../game");
const { getTable } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')


module.exports = (socketIO, socket) => {
     const onDeclareResult = async (payload, socketCallback) => {
          //console.log("onDeclareResult : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               const melds = payload.melds || "";
               if (!gameId) {
                    const err = customError.createCustomError(404, "Missing gameId");
                    loggerError.gameLog(gameId, "error on finish Game", err);
                    socketCallback({ status: 400, error: err });
               }
               const game = getTable(gameId);
               if (!game) {
                    const err = customError.createCustomError(404, "game obj not found");
                    loggerError.gameLog(gameId, "error on finish Game", err);
                    return socketCallback({ status: ERROR_CODES.GAME_FINISED, error: ERROR_MESSAGE.GAME_FINISED_MESSAGE });
               }
               //console.log("onDeclareResult : game object ", game);
                let resp = await game.onDeclareResultV2(socket.userId,melds,0);
                loggerError.gameLog(gameId, "error on finish Game", resp)
               gameService.updateGameOnEnd(resp._id,resp).catch(e=>{console.error(e)});
               socketCallback({ status: 200, data: resp });
               emitInRoom(gameId, socketEvents.rummy.gameSync, resp);
          } catch (error) {
               socketCallback({ status: 400, error: error });
               loggerError.gameLog(gameId, "error on finish Game", error);
               console.error(error);
          }

     }
     const emitInRoom = (roomId, eventName, data) => {
          if (socketIO) {
               //console.info("emitInRoom event name data ", roomId, eventName);
               loggerError.gameLog(roomId,"declareResult", roomId, eventName);
               const resp = { status: 200, data: data };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     socket.on(socketEvents.rummy.declare, onDeclareResult);
}
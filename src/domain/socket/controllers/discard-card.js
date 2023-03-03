"use strict";
const { customError } = require("../../shared/index");
const { socketEvents } = require("../events");
const { getTable } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')

module.exports = (socketIO, socket) => {
     const onDiscardCard = async (payload, socketCallback) => {
          //console.log("onDiscardCard : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               const cardId = payload.cardId || "";
               if (!gameId || !cardId) {
                    const err = customError.createCustomError(404, "Missing cardId/gameId");
                    loggerError.gameLog(gameId, "error on finish Game", err);
                    socketCallback({ status: 400, error: err });
               }
               const game = getTable(gameId);
               //console.log(" onDiscardCard game", game);
               if (!game) {
                    const err = customError.createCustomError(404, "game obj not found");
                    loggerError.gameLog(gameId, "error on finish Game", err);
                    return socketCallback({ status: 400, error: err });
               }
               const resp = await game.onDiscardCard(socket.userId, cardId);
               //console.log("onDiscardCard response ", resp);
               loggerError.gameLog(gameId, "onDiscardCard : payload", payload," response ", resp);
               socketCallback({ status: 200, data: resp });
               emitInRoom(gameId, socketEvents.rummy.gameSync, resp);
          } catch (error) {
               //console.log(error);
               loggerError.gameLog(gameId, "onDiscardCard : error", error);
               socketCallback({ status: 400, error: error });
          }

     }
     const emitInRoom = (roomId, eventName, data) => {
          if (socketIO) {
               console.info("emitInRoom event name data ", roomId, eventName);
               loggerError.gameLog(roomId, "discardController", roomId, eventName);
               const resp = { status: 200, data: data };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     socket.on(socketEvents.rummy.discardCard, onDiscardCard);
     socket.on("syncMelds", (body)=>{
          //console.log("\n \n sync Melds body \n ",body);
     });

}
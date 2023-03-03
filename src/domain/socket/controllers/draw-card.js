"use strict";
const { customError } = require("../../shared/index");
const { socketEvents } = require("../events");
const { getTable } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')

module.exports = (socketIO, socket) => {
     const onDrawCard = async (payload, socketCallback) => {
          //console.log("onDrawCard : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               
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
               //console.log("onDrawCard : game draw card ", game.draw[0]);
               //console.log("onDrawCard : game draw card ", game.deck[game.deck.length-1]);
               const from = payload.from || "open";
               let resp;
               if (from == 'open') {
                    loggerError.gameLog(gameId,'=============open draw request by=======',socket.userId);
                    resp = game.onDrawFromOpen(socket.userId);
               }
               else {
                    loggerError.gameLog(gameId,'=============close draw request by=======',socket.userId);
                    resp = game.onDrawFromClosed(socket.userId);
               }
               socketCallback({ status: 200, data: resp });
               loggerError.gameLog(gameId, 'Player leaving game', payload, "response" , resp);
               emitInRoom(gameId, socketEvents.rummy.gameSync, resp);
          } catch (error) {
               loggerError.gameLog(gameId, 'Error ', error);
               socketCallback({ status: 400, error: error });
               console.error(error);
          }

     }
     const emitInRoom = (roomId, eventName, data) => {
          if (socketIO) {
               //console.info("emitInRoom event name data ", roomId, eventName);
               loggerError.gameLog(roomId,"drawCardController", roomId, eventName);
               const resp = { status: 200, data: data };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     socket.on(socketEvents.rummy.drawCard, onDrawCard);
}
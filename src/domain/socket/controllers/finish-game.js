"use strict";
const { tableInitValidator } = require("../validators")
const { customError } = require("../../shared/index");
const { ERROR_CODES } = require("../../constants");
const commonFunctions = require("./common-functions");
const { socketEvents } = require("../events");
const { gameService } = require("../../game");
const { Rummy } = require("../../rummy/base");
const { getTable, setTable } = require("../../rummy/table-manager");
const loggerError = require('../../../utils/logger')
const repo = require("../../game/repo");
const { PLAYER_STATE, GAME_STATES,ROOM_MODE } = require("../../constants/game-type");

module.exports = (socketIO, socket) => {
     const onFinishGame = async (payload, socketCallback) => {
          //console.log("onFinishGame : payload", payload);
          const gameId = payload.tableId || socket.tableId || "";
          try {
               const cardId = payload.cardId || "";
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
               //console.log("onFinishGame : game object ", game);
                let resp = await game.onFinishGame(socket.userId, cardId);
                //loggerError.gameLog(gameId, "onFinishGame : game object ", game," response ", resp);
                let updatestateInMongo = await repo.findOneUpdate({gameId:gameId},{$set:{gameState:GAME_STATES.FINISHED}})
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
               console.info("emitInRoom event name data ", roomId, eventName);
               loggerError.gameLog(roomId,"finishGameController", roomId, eventName);
               const resp = { status: 200, data: data };
               return socketIO.in(roomId).emit(eventName, resp);
          }
     }
     socket.on(socketEvents.rummy.finish, onFinishGame);
}
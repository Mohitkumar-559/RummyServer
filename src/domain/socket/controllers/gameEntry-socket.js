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
     const onGameEntry = async (payload, socketCallback) => {
          let runningGame;
          const gameId = payload.gameId || socket.gameId || "";
          loggerError.Log(gameId, "User Enter in the game Board " + socket.name, payload);
          try {
               // Case 1- Unable to find the requested table in waiting queue
               if (!gameId) {
                    const err = customError.createCustomError(404, "Missing gameId");
                    loggerError.Log(gameId, "Missing gameId", err);
                    socketCallback({ status: ERROR_GAME, errorMessage: "Missing gameId" });
                    return;
               }
               runningGame = getTable(gameId);
               loggerError.Log(gameId, "GAME DATA ON GAME ENTRY REQUEST=>" + socket.name, runningGame?._id);
               
               // Case 4- Unable to find the requested table in running queue
               if (!runningGame || runningGame == undefined) {
                    const err = customError.createCustomError(404, "Game Not Found");
                    loggerError.Log(gameId, "game not found in running table", err);
                    socketCallback({ status: GAME_FINISED, errorMessage: GAME_FINISED_MESSAGE });
                    return;
               }
               let resp = runningGame.onEntryPointGame(socket.userId);
               loggerError.Log(gameId, "Success on game on entry point response =>", {});
               socketCallback({ status: 200, data: resp });
               return;


          } catch (error) {
               console.error('Error in gameSync', gameId, error);
               loggerError.Log(gameId, "Error in gameSync", error, runningGame, waitingGame, gameId);
               socketCallback({ status: ERROR, errorMessage: ERROR_MESSAGE });
          }
     }
     socket.on(socketEvents.rummy.onGameEntry, onGameEntry);
}


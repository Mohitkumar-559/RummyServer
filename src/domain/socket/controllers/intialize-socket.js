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
     const initialize = async (payload, socketCallback) => {
          //console.log("onTableInit payload : ", payload);
          try {
               //joining into the room 
               const commonRoom = commonFunctions.createRoomIds(table._id);
               const personalRoom = commonFunctions.createRoomIds(table._id, socket.userId);
               socket.join(commonRoom);
               socket.join(personalRoom);
               //emitter function to emit the data to room with status code
               
          } catch (error) {
               console.error(error);
               loggerError.gameLog(table._id, 'Error in Table init', error);
                    
               socketCallback({ status: 400, error: error });
          }

     }
     
     socket.on(socketEvents.matchMaking.Intialize, initialize);
     
}
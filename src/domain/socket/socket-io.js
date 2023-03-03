"use strict";
// const pubSubClient = require("../../infra/Redis/pub-sub-client");
const {
     authenticateSocketConnection
} = require("./middlewares/authentication");
const {
     socketEvents
} = require("./events");
const {
     tableInitController,
     gameStartController,
     drawCardController,
     discardController,
     finishGameController,
     exitGameController,
     syncGameController,
     syncMeldsController,
     joinContestController,
     initializeController,
     gameEntryController,
     appDisconnect
} = require("./controllers");

const {
     TRY_SEARCHING_AGAIN,
     SUCCESS,
     ERROR
 } = require("../../domain/constants/error-codes")
 const {
     TRY_SEARCHING_AGAIN_MESSAGE,
     SUCCESS_MESSAGE,
     ERROR_MESSAGE
 } = require("../../domain/constants/error-message")

const loggerError = require('../../utils/logger');
const declareResult = require("./controllers/declare-result");
let socketIO;
exports.initSocketServer = (httpServer, serverType) => {
          const socketOptions = {
               path: '/v1/socket.io',
               pingTimeout: 6000, 
               pingInterval: 5000
          };
          socketIO = require('socket.io')(httpServer, socketOptions);
          const {
               createAdapter
          } = require("@socket.io/redis-adapter");
          // const pubClient = pubSubClient.redisPubSubClient();
          // const subClient = pubClient.duplicate();
          // socketIO.adapter(createAdapter(pubClient, subClient));
          socketIO.sockets.setMaxListeners(0);
          socketIO.use(authenticateSocketConnection);
          socketIO.on(socketEvents.default.connection, onSocketConnection);
          socketIO.on(socketEvents.default.connect_error, errorHandler);
          socketIO.on(socketEvents.default.connect_timeout, errorHandler);
          socketIO.on(socketEvents.default.error, errorHandler);
          socketIO.on(socketEvents.default.disconnect, errorHandler);
          socketIO.on(socketEvents.default.reconnect, errorHandler);
          socketIO.on(socketEvents.default.reconnect_error, errorHandler);
          socketIO.on(socketEvents.default.pong, pongHandler);

          function onSocketConnection(socket) {

               console.info("onSocketConnection id ", socket.userId);
               console.info("onSocketConnection name ", socket.name);
               tableInitController(socketIO, socket);
               joinContestController(socketIO, socket);
               drawCardController(socketIO, socket);
               discardController(socketIO, socket);
               finishGameController(socketIO, socket);
               declareResult(socketIO, socket);
               syncGameController(socketIO, socket);
               exitGameController(socketIO, socket);
               syncMeldsController(socketIO, socket);
               initializeController(socketIO, socket);
               gameStartController(socketIO, socket)
               gameEntryController(socketIO, socket)
               appDisconnect(socketIO, socket)

          }

          function errorHandler(err) {
               console.error("Socket Error handler : ", err);
          }

          

          function pongHandler(err) {
               if (err) {
                    console.error("pongHandler : Error", err);
               }
          }
          return socketIO;
}

exports.emitInRoom = (roomId, eventName, data) => {
     //console.log(roomId, 'Socket io server in emit function ', socketIO)
     if (socketIO) {
          console.info("emitInRoom event name data " + eventName, roomId, eventName);
          loggerError.gameLog(roomId, "Emit event " + eventName, data);

          const resp = {
               status: SUCCESS,
               data: data,
               errorMessage: SUCCESS_MESSAGE
          };
          const clients = socketIO.sockets.adapter.rooms.get(roomId);
          loggerError.gameLog(roomId, "Client list " + eventName, clients);
          return socketIO.to(roomId).emit(eventName, resp);

     }
}

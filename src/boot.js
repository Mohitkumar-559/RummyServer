require("./infra/Mongo/mongo-conn");
const httpServer = require("./interfaces/http-server");
const socketServer = require("./domain/socket/socket-io");
const socketIO = socketServer.initSocketServer(httpServer, "Socket");
const intializeRabbitMQ = require("./interfaces/rabbitMQ-server");
const intializeRummyService = require("./interfaces/rummy-service")
const port = process.env.PORT;
const initRabbitMQ = new intializeRabbitMQ();
const initRummyService = new intializeRummyService()
// const {RabbitMQ} = require("../src/interfaces/queue.context");
// module.exports = { rabbitMQ }
httpServer.listen(port, () => {
     //const rabbitMQ = new RabbitMQ();
     console.log("Server Running on port "+port);
});
exports.socketIO = socketIO;
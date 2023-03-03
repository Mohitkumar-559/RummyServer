const  {gameLog}  =  require("../utils/logger");
const {GAME_TYPES} =  require("../domain/constants/game-type")
const client = require("amqplib");
const { Connection, Channel } = require("amqplib");
const UserService = require("../domain/user/user.service");
const GetContest = require("../../src/domain/user/contest.details")
const loggerError = require('../utils/logger')
// import { IUser } from './user';
// import { GameTicketData } from '@api/dto/contest.dto';
const tx = require('tx2')
const activeGame = tx.counter({
     name : 'Active Game'
})
const activeUser = tx.counter({
    name : 'Active User'
})
class RabbitMQ {
    _connection= Connection;
    _winningChannel=Channel;
    GAME_JOIN_QUEUE = 'oneto11-queue-NewJoinGame-Rummy';
    LOG_GAME_QUEUE = 'oneto11-queue-CreateRummyEventLog';
    WINNING_GAME_QUEUE = 'oneto11-queue-DeclareRummyResult';
    WINNING_GAME_QUEUE_DEAL = 'oneto11-queue-DeclareDealRummyResult'

    constructor() {
        this.setupConnection()
    }

    async setupConnection() {
        try {
            this._connection = await client.connect(
                process.env.RABBITMQ_URL
            )
            this._winningChannel = await this._connection.createChannel();
            await this._winningChannel.assertQueue(this.WINNING_GAME_QUEUE);
            this._logChannel = await this._connection.createChannel();
            await this._logChannel.assertQueue(this.LOG_GAME_QUEUE);
            await this.registerListeners();
            console.log('RabbitMQ Connected')
        } catch (err) {
            console.log('Error while connecting to RabbitMQ', err)
        }
    }

    async registerListeners(){
        await this.joinGameListener();
    }

    async joinGameListener(){
        try {
            const channel = await this._connection.createChannel()
        await channel.assertQueue(this.GAME_JOIN_QUEUE);
        // TODO: Find optimal number for prefetch refer stackoverflow
        channel.prefetch(4);
        console.log('Adding listner')
        //const userService = new UserService();
        let resp = await channel.consume(this.GAME_JOIN_QUEUE, async (msg)=>{
                const data = JSON.parse(msg.content.toString());
                const user = data.user
                const ticket = data.ticket
                console.log('Processing msg ', data, msg.fields.deliveryTag)
                gameLog('joinGame','Processing msg ', data, msg.fields.deliveryTag);
                // await timeout(3000);
                let resp = await UserService.UserService(user, ticket);
                gameLog('joinGame', 'Done process msg ', msg.fields.deliveryTag);
                channel.ack(msg);
                //here change the status to work
                let getRabbit = new GetContest()
                loggerError.Log(ticket.gameId, 'Change rabbotMq status', resp)
                let setRabbit = getRabbit.setRabbitMQData(ticket.gameId)

            // await UserService.Instance.joinGame(null, null, null)
        });
            
        } catch (error) {
            console.log(error)
        }
        
    }
    async pushToWinningQueue(msg,gameMode) {
        try {
            gameLog('rabbitmq-win-queue', 'Winning data in rabbitmQ', msg);
            const msgBuffer = Buffer.from(JSON.stringify(msg));
            let resp;
            if(gameMode == GAME_TYPES.DEAL)
            {
                resp = await this._winningChannel.sendToQueue(this.WINNING_GAME_QUEUE_DEAL, msgBuffer);
            }
            if(gameMode == GAME_TYPES.POINT){
                resp = await this._winningChannel.sendToQueue(this.WINNING_GAME_QUEUE, msgBuffer);
            }    
            console.log(resp);
            return resp
        } catch (err) {
            gameLog('rabbitmq-win-queue', 'Error in winning data', msg, err)
            return false
        }
    }
    async pushToLogQueue(msg){
        try {
            gameLog('rabbitmq-log-queue', 'Log data', msg)
            const msgBuffer = Buffer.from(JSON.stringify(msg));
            
            const resp = this._logChannel.sendToQueue(this.LOG_GAME_QUEUE, msgBuffer);
            console.log(resp)
            return resp
        } catch (err) {
            gameLog('rabbitmq-log-queue', 'Error in pushing log', msg, err)
            return false
        }
    }
}
module.exports = { RabbitMQ,activeGame }

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
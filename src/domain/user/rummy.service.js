const {
    socketEvents
} = require("../socket/events");
const {
    gameService
} = require("../game");
const {
    Rummy
} = require("../rummy/base");
const commonFunctions = require("../socket/controllers/common-functions");
const { XFac } = require("../xfac/xfac");


const {
    getTable,
    setTable,
    setTableForMatch,
    getTableForMatch,
    getTableWaitingTable
} = require("../../domain/rummy/table-manager");
// const httpServer = require("../../interfaces/http-server");
// const socketOptions = {
//     path: '/v1/socket.io'
// };
// const socketIO = require('socket.io')(httpServer, socketOptions);
const socketServer = require("../../domain/socket/socket-io");
const loggerError = require("../../utils/logger")
const GAME_START_TIMER = 5000;
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
//const { io } = require("socket.io-client");
const intializeRabbitMQ = require("../../interfaces/rabbitMQ-server"); 
const { GAME_MODE } = require("../constants/game-type");

class rummyService {

    constructor() {
        //
    }
    parseTableInitResponse = (table) => {
        const response = {
            _id: table._id,
            metaData: table.metaData,
            players: table.players,
            gameState: table.gameState
        }
        return response;
    }
    emitInRoom = (roomId, eventName, data) => {
        loggerError.Log(roomId, 'Emit in room called =>', eventName, data)
        socketServer.emitInRoom(roomId, eventName, data)
        
        // if (socketIO) {
        //     console.info("emitInRoom event name data " + eventName, roomId, eventName);
        //     loggerError.gameLog(roomId, "Emit event " + eventName, data);

        //     const resp = {
        //         status: SUCCESS,
        //         data: data,
        //         errorMessage: SUCCESS_MESSAGE
        //     };
        //     const clients = socketIO.sockets.adapter.rooms.get(roomId);
        //     loggerError.gameLog(roomId, "Client list " + eventName, clients);
        //     return socketIO.to(roomId).emit(eventName, resp);
        // }
    }
    getTransactionData(table) {
        var data = {
            cid: Number(table.contestId),
            userList: [],
            gameserverid: table._id
        }
        for (let i = 0; i < table.players.length; i++) {
            let player = table.players[i]
            data.userList.push({
                UserId: player.DID,
                UserLoginId: player.MID,
                ReferCode: player.REFER_CODE
            })
        }
        return data
    }
    async preStart(table, contestId, gameMode,xfac) {
        try {
            let game = {    
                _id: table._id,
                gameState: 1
            }
            loggerError.gameLog(table._id, 'Prestart game called', table.players);
            loggerError.Log(table._id, 'Prestart game called', table);
            
            let getPrevious = await getTable(game._id);
            loggerError.gameLog(table._id, 'Check table is created or not ; previous', getPrevious);
            if (!getPrevious) {
                loggerError.gameLog(table._id, 'Setting up the game data', game);
                let deductBalanceResponse = await intializeRabbitMQ.Instance.Transaction.JoinContest(this.getTransactionData(table),gameMode);
                
                console.log("\n player amount deduction occuered ", deductBalanceResponse);
                loggerError.gameLog(table._id, " player amount deduction occuered ", deductBalanceResponse);
                loggerError.Log(table._id, 'Deduct balance response ', deductBalanceResponse);
            
                game.roomId = deductBalanceResponse.RoomId;
                game.WalletTransactionArray = deductBalanceResponse.WalletTransactionArray;
                setTable(game);

            }

            loggerError.gameLog(table._id, 'Calling start gamee', getPrevious);
            loggerError.Log(table._id, 'Calling start game', getPrevious);
            
            return this.start(game, table, xfac)


        } catch (error) {
            xfac ? xfac.freeSelf(): null;
            console.error('Error on prestart game=>', error);
            loggerError.Log(table?._id, 'Error in preStart game=>', error);
            return error
        }

    }

    start(game, table, xfac) {
        //joining into the room 
        // const commonRoom = commonFunctions.createRoomIds(table._id);
        //const personalRoom = commonFunctions.createRoomIds(table._id, socket.userId);
        //
        // socketIO.join(commonRoom);
        //socket.join(personalRoom);
        loggerError.gameLog(table._id, 'setting delay for game start')
        let startTimer = setTimeout(async () => {
            loggerError.gameLog(table._id, 'Game start run after delay');
            loggerError.Log(table._id, 'Start game called ');
            
            let getPrevious = await getTable(game._id);
            let getmetaData = await getTableWaitingTable(game._id)

            let metaData = getPrevious.metaData || getmetaData.metaData;
            const gameRunning = new Rummy(table._id, table.players, this.emitInRoom, table.contestId, getPrevious.roomId, getPrevious.WalletTransactionArray,getmetaData.metaData, xfac);
            setTable(gameRunning);
            
            //delete the waiting table
            await gameRunning.delay(5000);
            // loggerError.gameLog(table._id, "Setting up the game table by user ", JSON.stringify(gameRunning))
            gameRunning.startGame();
            
            // table.players.forEach(async (player, index) => {
            //     const pRoom = commonFunctions.createRoomIds(table._id, player.userId);
            //     loggerError.gameLog(table._id, 'Sending game sync event');
            //     await this.emitInRoom(pRoom, socketEvents.rummy.gameSync, gameRunning.eventCards(index));
                
            // });

            //table.players.forEach(async (player, index) => {
                const commonRoom = commonFunctions.createRoomIds(table._id);
                await this.emitInRoom(commonRoom, socketEvents.rummy.gameSync, gameRunning.eventCards(0));
                loggerError.gameLog(table._id, "Sending game sync event ", gameRunning.eventCards(0))
            //});

        }, GAME_START_TIMER);



        return table._id;
    }


}
module.exports = { rummyService } 
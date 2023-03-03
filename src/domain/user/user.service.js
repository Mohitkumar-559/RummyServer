"use strict";
const { gameService } = require("../game");
const { BaseResponse } = require('../lib/baseresponse');
const { GAME_EXPIRE_SECONDS } = require("../constants/timers");
const { saveGameRedis } = require("../game/client");

const loggerError = require("../../utils/logger")
const intializeRabbitMQ = require("../../interfaces/rabbitMQ-server");
const intializeRummyService = require("../../interfaces/rummy-service");
const repo = require("../game/repo");
const { redisKeys } = require("../shared");
const { GAME_MODE, GAME_TYPES } = require("../../domain/constants/game-type");
const {activeGame} = require("../../interfaces/queue.context")

exports.stringifyGameData = (table) => {
    const stringifyData = {
        _id: table._id,
    }
    if (table.metaData) {
        stringifyData.metaData = JSON.stringify(table.metaData);
    }
    if (table.players) {
        stringifyData.players = JSON.stringify(table.players);
    }
    if (table.processId) {
        stringifyData.processId = table.processId;
    }
    if (table.turnNo) {
        stringifyData.turnNo = table.turnNo;
    }
    if (table.currentTurnIndex) {
        stringifyData.currentTurnIndex = table.currentTurnIndex;
    }
    if (table.gameState) {
        stringifyData.gameState = table.gameState;
    }
    if (table.turnTime) {
        stringifyData.turnTime = table.turnTime;
    }
    if (table.contestId) {
        stringifyData.contestId = table.contestId;
    }
    return stringifyData;
}


module.exports.UserService = async (user, ticket) => {
    let httpResp;
    try {
        const searchOpts = {
            _id: ticket.gameId,
            name: user.name,
            userId: user._id,
            pState: 1,
            DID: user._id,
            MID: user.mid,
            REFER_CODE: user.referCode
        };
        console.log('In rabbitmq LISTENRR')
        loggerError.gameLog(ticket.gameId, "Rabbit join event=======")

        loggerError.Log(ticket.gameId, " User come to join game in rabbitmq", user.name, ticket);

        let contestData = await intializeRabbitMQ.Instance.Transaction.getContestDetails(ticket.contestId.toString(),ticket.metaData.gameMode.toString())
        let xfacEnable = contestData.IsXFac;
        let gameMode =1;
        if(contestData.GameMode === undefined){
            gameMode = 1;
        }
        else{
            gameMode = contestData.GameMode
        }

        let table = gameService.onSearchGame(ticket.gameId, searchOpts);
        loggerError.gameLog(ticket.gameId, "Rabbit search from table=======", table, ticket)
        loggerError.Log(ticket.gameId, " Contest data on user join", xfacEnable, user.name, contestData, '\n table = ', table);

        if (!table) {
            console.info("Not found while searching, so creating new");
            let roomMode = 1;
            if (ticket.PointsValue == 0) {
                roomMode = 3
            }
            //get the contest by id
            let metaData={};
            if(gameMode == GAME_TYPES.POINT){
                metaData = {
                    gameType: 4,
                    roomMode: roomMode,
                    serverVersion: 1,
                    playerCount: contestData.noofplayers,
                    betValue: parseFloat(parseFloat(contestData.pointsvalue) * parseFloat(contestData.maxpoints)),
                    noOfDecks: contestData.noofdecks,
                    round: parseInt(contestData.round),
                    CommisionPercent: parseInt(contestData.commisionpercent),
                    gameModeX: xfacEnable ? GAME_MODE.XFAC : GAME_MODE.NORMAL,
                    gameMode:gameMode,
                    maxpoints:contestData.maxpoints
                };
            }
            if(gameMode == GAME_TYPES.DEAL){
                metaData = {
                    gameType: 4,
                    roomMode: roomMode,
                    serverVersion: 1,
                    playerCount: 2,
                    betValue: parseFloat(contestData.ja),
                    noOfDecks: contestData.noofdecks,
                    round: parseInt(contestData.round),
                    CommisionPercent: 0,
                    gameModeX: xfacEnable ? GAME_MODE.XFAC : GAME_MODE.NORMAL,
                    gameMode:gameMode,
                    maxpoints:parseFloat(parseFloat(contestData.pointsvalue) * parseFloat(contestData.round))
                };
            }
            
            loggerError.Log(ticket.gameId, "Createing new table for ", user.name, table)
            try {
                table = gameService.onCreateGame(ticket.gameId, ticket.contestId, metaData, searchOpts);
                const redisTable = module.exports.stringifyGameData(table);
                //console.log("redis table ", redisTable);
                const gameKey = redisKeys.gameHashKey(table._id);
                const resp = await saveGameRedis(gameKey, GAME_EXPIRE_SECONDS, redisTable);
                console.log(resp)
                await repo.saveData(table);

            } catch (error) {
                loggerError.gameLog(ticket.gameId, "Error while saving data in mongo", table)
            }
            loggerError.gameLog(ticket.gameId, "create game RabbitMQ from user " + user.name + "==" + table.toString())

            //botswitch = false;
            // httpResp = new BaseResponse(0, null, null, "", 'room created');
            // return httpResp
            // if (xfacEnable) {
            //     addXfacInGame(table)
            // }
        } else {
            // if (!table) {
            //     httpResp = new BaseResponse(0, null, null, "", 'User cannot join this game');
            //     return httpResp
            // }
            // else {
                console.info("\n table 1 ", JSON.stringify(table));
                let tableid
                if (table.isRunning) {
                    loggerError.Log(table._id, 'Calling prestart from user.service')
                    tableid = await intializeRummyService.Instance.RummyService.preStart(table, searchOpts.contestId,gameMode);
                }
                //gameService.checkWaitingTables(ticket.gameId,ticket.contestId)
                httpResp = new BaseResponse(1, tableid, null, "", null);
                return httpResp

            // }
        }

    }
    catch (e) {

        console.error(e)
        httpResp = new BaseResponse(0, null, null, "", (e).message);
    }
    return httpResp;

}

async function addXfacInGame(table) {
    let playerData = {
        _id: table._id,
        name: 'Naveen',
        userId: 'bd0276a5-c866-4e51-8a3a-039533e81905',
        pState: 1,
        DID: 'bd0276a5-c866-4e51-8a3a-039533e81905',
        MID: '315775',
        REFER_CODE: 'NAAA6A9C'
    }

    gameService.onSearchGame(table._id, playerData);

    if (table.isRunning) {
        return true
    }
    return false

}


const SqlDB = require("../Sql-interface");
const Redis = require("ioredis");
const redisKeys = require("../../Redis/redis-key");
const sql = require("mssql");
const loggerError = require('../../../utils/logger')
const { JoinContestResponse } = require("../../../domain/models/response/Response")
const { BadRequest } = require("../../../domain/models/response/Badresponse");
const ERROR_CODE = require("../../../domain/models/response/error.dto")
const mongoose = require("../../Mongo/mongo-conn")
const templateSchema = require("../../../domain/user/lobby.model")
const mongo = require('mongodb');
const intialiseRedis = require('../../../interfaces/redisConnection')
const {GAME_TYPES} = require('../../../domain/constants/game-type')


module.exports = class Transaction {
    _redisClient = intialiseRedis.Instance._redis;
    //dtRummyRoomParticipants: Array<{ UserId: string, UserLoginId: number, WalletTransactionId: number, ReferCode: string }> = [];
    //joinContestRespone = new JoinContestResponse();
    uow;
    constructor(UOW) {
        this.uow = new SqlDB();
    }
    get REDIS() {
        if (!this._redisClient) this._redisClient = GameServer.Instance.REDIS.INSTANCE
        return this._redisClient
    }

    async JoinContest(request,gameMode) {
        let joinContestRespone = new JoinContestResponse();
        let responseStatus = 0;
        try {
            console.log(request);
            loggerError.gameLog(request.gameserverid, `Request come to room creation`, request);
            const contestId = request.cid.toString();
            loggerError.gameLog(request.gameserverid, `getting Data from redis key by contestID `, contestId);
            var contestData = await this.getContestDetails(contestId, gameMode)
            console.log("Contest Data on JOin contest=>", contestData)
            loggerError.gameLog(request.gameserverid, `getting Data from redis `, contestData.templateid, contestData.bonuspercent);
            
            // if (contestData.templateid == undefined) {
            //     loggerError.gameLog(request.gameserverid, `Finding Data from from mongoDB`, contestData);
            //     const query = { templateid: contestId };
            //     let resp = await templateSchema.findOne(query);
            //     console.log("======" + resp);
            //     if (!resp) {
            //         loggerError.gameLog(request.gameserverid, `getting Data from from mongoDB`, contestData);
            //         throw new BaseHttpResponse(null, "No contest found", ERROR_CODE.DEFAULT)
            //     }
            //     contestData = resp;
            //     contestData.waitingtime = contestData.waitingtime * 1000;
            //     delete contestData._id;
            //     loggerError.gameLog(request.gameserverid, `getting Data from from mongoDB`, contestData);
            //     // let contestCounters = await redisKeys.getPlayerJoinCounter()
            //     // if(contestCounters[contestId]!= undefined && contestCounters[contestId]!= null)
            //     // {    contestData.total_joined = parseInt(contestCounters[contestId]);
            //     // }
            //     // else{
            //     //     contestData.total_joined=0;
            //     // }
            //     let response = {
            //         templateid: contestData.templateid,
            //         catid: contestData.catid,
            //         templatename: contestData.templatename,
            //         noofdecks: contestData.noofdecks,
            //         noofplayers: contestData.noofplayers,
            //         pointsvalue: contestData.pointsvalue,
            //         round: contestData.round,
            //         discountpercent: contestData.discountpercent,
            //         bonuspercent: contestData.bonuspercent,
            //         maxpoints: contestData.maxpoints,
            //         ismultipletableallowed: contestData.ismultipletableallowed,
            //         isactive: contestData.isactive,
            //         commisionpercent: contestData.commisionpercent,
            //         delaytime: contestData.delaytime,
            //         starttime: contestData.starttime,
            //         waitingtime: contestData.waitingtime,
            //         Duration: contestData.Duration
            //     }
            //     let get = await this.REDIS.hset(cacheKey, contestId.toString(), JSON.stringify(response));
            //     console.log(get)

            // }

            if (contestData) {
                loggerError.gameLog(request.gameserverid, `getting Data from redis or from mongoDB`, contestData, gameMode);
                request.mba = parseFloat(contestData.bonuspercent);
                if(gameMode == GAME_TYPES.POINT){
                    request.amt = parseFloat(contestData.pointsvalue) * parseFloat(contestData.maxpoints);
                }
                if(gameMode == GAME_TYPES.DEAL){
                    request.amt = parseFloat(contestData.ja);
                }
                loggerError.gameLog(request.gameserverid, `Calculating the amt and mba`, request.amt, request.mba);

                var tbl_UserList = new sql.Table();
                tbl_UserList.columns.add("UserId", sql.VarChar, { nullable: true });
                tbl_UserList.columns.add("UserLoginId", sql.BigInt, { nullable: true });
                tbl_UserList.columns.add("ReferCode", sql.VarChar, { nullable: true });

                for (let ul of request.userList) {
                    tbl_UserList.rows.add(ul.UserId, ul.UserLoginId, ul.ReferCode);
                }

                var paramObj = {
                    GameId: 4,
                    ContestId: request.cid,
                    Amount: request.amt,
                    GameTypeId: 2,
                    MaxBonusAllowed: request.mba,
                    GameServerId: request.gameserverid,
                    CatId: contestData.catid
                };

                const proc_name = "PROC_DEDUCT_JOIN_RUMMY_FEES";
                loggerError.gameLog(request.gameserverid, `PROC_DEDUCT_JOIN_RUMMY_FEES`, paramObj, tbl_UserList);
                var result = await this.uow.DeductMoneyForRummy(proc_name, paramObj, tbl_UserList);
                loggerError.gameLog(request.gameserverid, `PROC_DEDUCT_JOIN_RUMMY_FEES result`, result);

                if (result.length > 0) {
                    console.log("Result : " + result);
                    loggerError.gameLog(request.gameserverid, `Deduct money before room creation `, result);
                    let dtRummyRoomParticipants = [];
                    for (let o of result) {
                        var objParticipants = {
                            UserId: o.UserId,
                            UserLoginId: o.UserLoginId,
                            WalletTransactionId: o.WalletTransactionId,
                            ReferCode: o.ReferCode
                        };
                        if (o.ResponseStatus == 1) {
                            dtRummyRoomParticipants.push(objParticipants);
                        }
                        else if (o.ResponseStatus == 501) {
                            throw new BadRequest("Insufficient balance", ERROR_CODE.INSUFFICIENTBALANCE);
                        }
                        else {
                            throw new BadRequest("Transaction failed", ERROR_CODE.FAILED);
                        }

                    }
                    let game_proc_name;
                    if(gameMode == GAME_TYPES.POINT){
                        game_proc_name = "PROC_CreateRummyRoomAndAssignToUser"
                    }
                    if(gameMode == GAME_TYPES.DEAL){
                        game_proc_name = "PROC_CreateDealRummyRoomAndAssignToUser"
                    }
                    
                    var gameParam = {
                        ContestId: request.cid,
                        GameServerId: request.gameserverid
                    };
                    var tblRummyRoomParticipants = new sql.Table();
                    tblRummyRoomParticipants.columns.add("UserId", sql.VarChar, { nullable: true });
                    tblRummyRoomParticipants.columns.add("UserLoginId", sql.BigInt, { nullable: true });
                    tblRummyRoomParticipants.columns.add("WalletTransactionId", sql.BigInt, { nullable: true });
                    tblRummyRoomParticipants.columns.add("ReferCode", sql.VarChar, { nullable: true });
                    let WalletTransactionArray = []
                    for (let ul of dtRummyRoomParticipants) {
                        tblRummyRoomParticipants.rows.add(ul.UserId, ul.UserLoginId, ul.WalletTransactionId, ul.ReferCode);
                        WalletTransactionArray.push({ userId: ul.UserId, UserId: ul.UserLoginId, WalletTransactionId: ul.WalletTransactionId, ReferCode: ul.ReferCode })
                    }
                    loggerError.gameLog(request.gameserverid, `Request to create room`, game_proc_name, gameParam, tblRummyRoomParticipants);
                    // var gameResult = await this.uow.createRoomForRummy(game_proc_name, gameParam,tbl_UserList);
                    var gameResult = await this.uow.createRoomForRummy(game_proc_name, gameParam, tblRummyRoomParticipants);
                    loggerError.gameLog(request.gameserverid, 'Result of create room=>', gameResult )
                    if (gameResult.length > 0) {
                        responseStatus = gameResult[0].status;
                        if (responseStatus == 1 && gameResult[0].RoomId > 0) {
                            joinContestRespone.ResponseStatus = 1;
                            joinContestRespone.RoomId = gameResult[0].RoomId;
                            joinContestRespone.WalletTransactionArray = WalletTransactionArray;
                            loggerError.gameLog(request.gameserverid, `Room creation successfully`, gameResult);
                        }
                        else {
                            var tbl_RefundUserList = new sql.Table();
                            tbl_RefundUserList.columns.add("UserId", sql.VarChar(50), { nullable: true });
                            tbl_RefundUserList.columns.add("WalletTransactionId", sql.BigInt, { nullable: true });

                            for (let ul of dtRummyRoomParticipants) {
                                tbl_RefundUserList.rows.add(ul.UserId, ul.WalletTransactionId);
                            }

                            const proc_refund_name = "PROC_REFUND_RUMMY_GAME_ENTRY_FEE";
                            var refund_result = await this.uow.RefundToUser(proc_refund_name, tbl_RefundUserList);

                            loggerError.gameLog(request.gameserverid, `Refund money in step 1 `, gameResult);

                            joinContestRespone.ResponseStatus = 0;
                            throw new BadRequest("Room creation failed", ERROR_CODE.FAILED);
                        }
                    }
                    else {

                        var tbl_RefundUserList = new sql.Table();
                        tbl_RefundUserList.columns.add("UserId", sql.VarChar(50), { nullable: true });
                        tbl_RefundUserList.columns.add("WalletTransactionId", sql.BigInt, { nullable: true });

                        for (let ul of dtRummyRoomParticipants) {
                            tbl_RefundUserList.rows.add(ul.UserId, ul.WalletTransactionId);
                        }

                        const proc_refund = "PROC_REFUND_RUMMY_GAME_ENTRY_FEE";
                        var refund_result1 = await this.uow.RefundToUser(proc_refund, tbl_RefundUserList);

                        loggerError.gameLog(request.gameserverid, `Refund money in step 2 `, gameResult);

                        joinContestRespone.ResponseStatus = 0;
                        throw new BadRequest("Room creation failed", ERROR_CODE.FAILED);
                    }
                }
                else {
                    joinContestRespone.ResponseStatus = 0;
                    throw new BadRequest("Transaction failed", ERROR_CODE.FAILED);
                }
            }
            else {
                loggerError.gameLog(request.gameserverid, 'Contest does not exists');
                throw new BadRequest("Contest does not exists", ERROR_CODE.CONTESTNOTFOUND);
            }

        }
        catch (ex) {
            console.error(ex)
            joinContestRespone.ResponseStatus = 0;
            loggerError.gameLog(request.gameserverid, 'Players enter to table error', ex);
            throw new BadRequest(JSON.stringify(ex.message), ERROR_CODE.EXCEPTION);
        }
        return joinContestRespone;
    }

    async GetUserBalance(UserId) {
        const proc_name = "PROC_GET_UserBalanceForContestJoin";
        let Param = "@UserId=" + UserId
        var Result = await this.uow.GetDataFromTransaction(proc_name, Param);
        return Result
    }

    async getContestWinners(request, gameId) {


        try {
            loggerError.gameLog(gameId, 'User data in in getContestWinner', request);
            if (request.rummyParticipantScore.length > 0) {
                var tbl_UserList = new sql.Table();
                tbl_UserList.columns.add("UserId", sql.BigInt, { nullable: true });
                tbl_UserList.columns.add("Score", sql.BigInt, { nullable: true });

                for (let ul of request.rummyParticipantScore) {
                    tbl_UserList.rows.add(ul.UserId, ul.Score);
                }

                const proc_name = "PROC_DECLARE_DEAL_RUMMY_GAME_WINNERS_FOR_SOCKET";//"PROC_DECLARE_DEAL_RUMMY_GAME_WINNERS_FOR_SOCKET";
                var result = await this.uow.GetDataForContestWinners(proc_name, request.ContestId, request.RoomId, tbl_UserList);
                loggerError.gameLog(gameId, 'Resultsest in getContestWinner', result);
                if (result.length > 0)
                    return result;
                else
                    throw new BadRequest("Something went wrong with procedure", ERROR_CODE.FAILED);
            }
            else {
                throw new BadRequest("Invalid request", ERROR_CODE.INVALIDREQUEST);
            }
        } catch (ex) {
            console.log(JSON.stringify(ex.message));
            throw new BadRequest(JSON.stringify(ex.message), ERROR_CODE.EXCEPTION);
        }
    }
    // async getContestDetailsOld(contestId) {
    //     const cacheKey = redisKeys.getContestDetailKey(contestId);
    //     var contestData;
    //     contestData = await this.REDIS.hget(cacheKey, contestId.toString())
    //     loggerError.gameLog(cacheKey, `getting Data from redis key `, contestData);
    //     if (!contestData) {
    //         const query = { templateid: contestId };
    //         let resp = await templateSchema.findOne(query);
    //         console.log("======" + resp);
    //         if (!resp) {
    //             loggerError.gameLog(cacheKey, `getting Data from redis key `, contestData);
    //             throw new BaseHttpResponse(null, "No contest found", ERROR_CODE.DEFAULT)

    //         }
    //         contestData = resp;
    //         contestData.waitingtime = contestData.waitingtime * 1000;
    //         // let contestCounters = await redisKeys.getPlayerJoinCounter()
    //         // if(contestCounters[contestId]!= undefined && contestCounters[contestId]!= null)
    //         // {    contestData.total_joined = parseInt(contestCounters[contestId]);
    //         // }
    //         // else{
    //         //     contestData.total_joined=0;
    //         // }
    //         let response = {
    //             templateid: contestData.templateid,
    //             catid: contestData.catid,
    //             templatename: contestData.templatename,
    //             noofdecks: contestData.noofdecks,
    //             noofplayers: contestData.noofplayers,
    //             pointsvalue: contestData.pointsvalue,
    //             round: contestData.round,
    //             discountpercent: contestData.discountpercent,
    //             bonuspercent: contestData.bonuspercent,
    //             maxpoints: contestData.maxpoints,
    //             ismultipletableallowed: contestData.ismultipletableallowed,
    //             isactive: contestData.isactive,
    //             commisionpercent: contestData.commisionpercent,
    //             delaytime: contestData.delaytime,
    //             starttime: contestData.starttime,
    //             waitingtime: contestData.waitingtime,
    //             Duration: contestData.Duration
    //         }
    //         let get = await this.REDIS.hset(cacheKey, contestId.toString(), JSON.stringify(response));
    //         console.log(get)
    //         return contestData;
    //     }
    //     else {
    //         return JSON.parse(contestData)
    //     }
    // }

    async getContestDetails(contestId, gameMode) {
        let contestDetails={}
        const cacheKey = redisKeys.ContestDetails('4',gameMode);
        var contestData = await this.getContestById(cacheKey,contestId)
        //loggerError.gameLog(cacheKey, `getting Data from redis key `, contestData);
        const procName = "PROC_GET_RummyContestsByContestId";
        const procParam = `@ContestId=${contestId}`
        if(!contestData){
            let response = await this.uow.GetDataFromCasualGame(procName, procParam);
            if (!response) {
                throw new BaseHttpResponse(null, "No contest found", ERROR_CODE.DEFAULT)
            }
            contestData = {
                templateid: response[0].cid,
                catid: response[0].catid,
                cname: response[0].cname,
                templatename: response[0].templatename,
                noofdecks: response[0].noofdecks,
                noofplayers: response[0].noofplayers,
                pointsvalue: response[0].pointsvalue,
                maxpoints: response[0].maxpoints,
                Duration: response[0].Duration,
                round: response[0].round,
                discountpercent: response[0].discountpercent,
                bonuspercent: response[0].bonuspercent,
                commisionpercent: response[0].commisionpercent,
                starttime: response[0].StartTime,
                waitingtime: response[0].WaitingTime * 1000,
                delaytime: response[0].DelayTime * 1000,
                ismultipletableallowed: response[0].ismultipletableallowed,
                isactive: response[0].isactive,
                IsXFac: response[0].IsXFac,
                GameMode: gameMode
            }   
        }
        else{
            if(contestData.templateid == undefined){
                contestDetails = {
                    templateid: contestData.cid,
                    catid: contestData.catid,
                    cname: contestData.cname,
                    templatename: contestData.templatename,
                    noofdecks: contestData.noofdecks,
                    noofplayers: contestData.noofplayers,
                    pointsvalue: contestData.pointsvalue,
                    maxpoints: contestData.maxpoints,
                    Duration: contestData.Duration,
                    round: contestData.round,
                    discountpercent: contestData.discountpercent,
                    bonuspercent: contestData.bonuspercent,
                    commisionpercent: contestData.commisionpercent,
                    starttime: contestData.StartTime,
                    waitingtime: contestData.WaitingTime * 1000,
                    delaytime: contestData.DelayTime * 1000,
                    ismultipletableallowed: contestData.ismultipletableallowed,
                    isactive: contestData.isactive,
                    IsXFac: contestData.IsXFac,
                    GameMode: gameMode
                }
            }
            else{
                contestDetails = {
                    templateid: contestData.templateid,
                    catid: contestData.catid,
                    cname: contestData.cname,
                    templatename: contestData.templatename,
                    noofdecks: contestData.noofdecks,
                    noofplayers: contestData.noofplayers,
                    pointsvalue: contestData.pointsvalue,
                    maxpoints: contestData.maxpoints,
                    Duration: contestData.Duration,
                    round: contestData.round,
                    discountpercent: contestData.discountpercent,
                    bonuspercent: contestData.bonuspercent,
                    commisionpercent: contestData.commisionpercent,
                    starttime: contestData.StartTime,
                    waitingtime: contestData.WaitingTime * 1000,
                    delaytime: contestData.DelayTime * 1000,
                    ismultipletableallowed: contestData.ismultipletableallowed,
                    isactive: contestData.isactive,
                    IsXFac: contestData.IsXFac,
                    GameMode: gameMode
                }
            }
            
        }
        
               
        console.log(contestData)
        return contestData
    }
    async getContestById(rediskey, contestId){
        let contest={} ;
        let contestData = await this.REDIS.get(rediskey)
        contestData = JSON.parse(contestData)
        if(contestData){
            for (let index = 0; index < contestData.length; index++) {
                //console.log(typeof(contestData[index].templateid))
                if(typeof( contestData[index].templateid)=='undefined'){
                    if(parseInt(contestId) == contestData[index].cid){
                        contest = contestData[index]
                        break;
                    }
                }
                else{
                    if(parseInt(contestId) == contestData[index].templateid){
                        contest = contestData[index]
                        break;
                    }
                }
                
                
            }
        }
        
        return contest
    }

    async getContestList(gameId, gameMode){
        let cList= []
        if (gameId == GameIds.RUMMY) {
            if(gameMode==GAME_TYPES.POINT)
                cList = await this.getRummyContestList(gameMode);

            if(gameMode==GAME_TYPES.DEAL)
                cList = await this.getDealRummyContestList(gameMode);

        } else {
            const cacheKey = RedisKeys.ContestDetails(String(gameId),gameMode);
            let contests=[];
            let contestCounters = await this.getPlayerJoinCounter(gameId)
            contests = await this.redis.get(cacheKey);
            for (let i = 0; i < contests.length; i++) {
                contests[i]['total_joined'] = contestCounters[contests[i].templateid]
                let contest = contests[i];
                if (gameMode) {
                    if (contest.GameMode == gameMode) {
                        cList.push(contest)
                    }
                } else {
                    cList.push(contest)
                }
            }
        }
        return cList
    }

    async getRummyContestList(gameMode){
        const cacheKey = RedisKeys.ContestDetails(String(GameIds.RUMMY),gameMode);
        let contests=[];
        let cList= []
        let contestCounters = await this.getPlayerJoinCounter(GameIds.RUMMY)
        contests = await this.redis.get(cacheKey);
        for (let i = 0; i < contests.length; i++) {
            let contest = {
                templateid: contests[i].cid||contests[i].templateid,
                catid: contests[i].catid,
                cname: contests[i].cname||contests[i].cn,
                templatename: contests[i].templatename||"deal rummy",
                noofdecks: contests[i].noofdecks||2,
                noofplayers: contests[i].noofplayers||2,
                pointsvalue: contests[i].pointsvalue||0,
                round: contests[i].round||2,
                discountpercent: contests[i].discountpercent||0,
                bonuspercent: contests[i].bonuspercent||0,
                maxpoints: contests[i].maxpoints||0,
                ismultipletableallowed: contests[i].ismultipletableallowed||false,
                isactive: contests[i].isactive||1,
                commisionpercent: contests[i].commisionpercent||10,
                total_joined: contests[i].total_joined||0,
                StartTime: contests[i].starttime||contests[i].StartTime,
                WaitingTime: contests[i].waitingtime||contests[i].WaitingTime||1000,
                DelayTime: contests[i].delaytime||15000,
                duration: contests[i].duration||13000,
                GameMode: contests[i].GameMode||1
            }
            cList.push(contest)
            //let startTime = contest.starttime;
            //let delayFromStart = (currentTime-startTime)%contest.contestStartInEveryMs;
            //cList[i]['timeSlot'] = currentTime - delayFromStart;
            cList[i]['total_joined'] = (contestCounters[contest.templateid] != undefined && contestCounters[contest.templateid] != null) ? contestCounters[contest.templateid] : 0;
            //cList[i]['gameStartIn'] =  contest.contestStartInEveryMs - delayFromStart;
        }
        return cList;
    }
    async getDealRummyContestList(gameMode){
        const cacheKey = RedisKeys.ContestDetails(String(GameIds.RUMMY),gameMode);
        let contests=[];
        let cList= []
        let contestCounters = await this.getPlayerJoinCounter(GameIds.RUMMY)
        contests = await this.redis.get(cacheKey);
        for (let i = 0; i < contests.length; i++) {
            let contest = {
                templateid: contests[i].cid||contests[i].templateid,
                catid: contests[i].catid,
                cname: contests[i].cname||contests[i].cn,
                templatename: contests[i].templatename||"deal rummy",
                noofdecks: contests[i].noofdecks||2,
                noofplayers: contests[i].noofplayers||2,
                pointsvalue: contests[i].pointsvalue||0,
                round: contests[i].round||2,
                discountpercent: contests[i].discountpercent||0,
                bonuspercent: contests[i].bonuspercent||0,
                maxpoints: contests[i].maxpoints||0,
                ismultipletableallowed: contests[i].ismultipletableallowed||false,
                isactive: contests[i].isactive||1,
                commisionpercent: contests[i].commisionpercent||10,
                total_joined: contests[i].total_joined||0,
                StartTime: contests[i].starttime||contests[i].StartTime,
                WaitingTime: contests[i].waitingtime||contests[i].WaitingTime||1000,
                DelayTime: contests[i].delaytime||15000,
                duration: contests[i].duration||13000,
                GameMode: contests[i].GameMode||2,
                ja: contests[i].ja,
                wa: contests[i].wa
            }
            cList.push(contest)
            //let startTime = contest.starttime;
            //let delayFromStart = (currentTime-startTime)%contest.contestStartInEveryMs;
            //cList[i]['timeSlot'] = currentTime - delayFromStart;
            cList[i]['total_joined'] = (contestCounters[contest.templateid] != undefined && contestCounters[contest.templateid] != null) ? contestCounters[contest.templateid] : 0;
            //cList[i]['gameStartIn'] =  contest.contestStartInEveryMs - delayFromStart;
        }
        return cList;
    }
    async putNoOpponentFound(userId,constestId){
        const proc_name = "PROC_RUMMY_CREATE_NO_OPPONENT_LOG";
        let Param = "@UserId="+userId;
        Param+=", @ContestId=" + constestId;
        var Result = await this.uow.GetDataFromCasualGame(proc_name, Param);
        return Result
    }
}
const Redis =reuire("ioredis");
const { RedisKeys } = require("../../../domain/shared");
const { Transaction } =require("./transaction")
const SqlDB = require( "../Sql-interface");
const BadRequest = require("../../../domain/models/response/Badresponse");
export class GetContest {
    matchContestDetails = [];
    prizeBreakUp=[]
    _redisClient= Redis;
    _transactionService= Transaction;
    uow;

    constructor( UOW) {
        this.uow = UOW;
        this._transactionService = new Transaction(UOW);
    }

    get REDIS() {
        if (!this._redisClient) this._redisClient = GameServer.Instance.REDIS.INSTANCE
        return this._redisClient
    }

    async SaveGameContestDetailsInCache(gameId) {
        const proc_name = "PROC_GET_GameContests_V2";
        const param = "@GameId=" + gameId;
        var result = await this.uow.GetDataFromCasualGame(proc_name, param);
        return result;
    }

    async incContestCounter(contestId, incBy) {
        return await this.REDIS.hincrby(RedisKeys.JoinedContestCount('1'), contestId, incBy)
    }
    async getPrizeBreakUp(contestId) {
        try {
            const prizebreakupcacheName = RedisKeys.ContestPrizeBreakUp(contestId.toString());
            let cacheResp = await this.REDIS.get(prizebreakupcacheName);
            if (cacheResp != null) {
                this.prizeBreakUp = JSON.parse(cacheResp.toString());
                this.prizeBreakUp = from(this.prizeBreakUp).orderBy((x) => x.wf).toArray()
            }
            else {
                const oPrize = new GetContest(this.uow);
                this.prizeBreakUp = await oPrize.SaveContestPriceBreakupInCache(contestId)
                if (this.prizeBreakUp != null) {
                    await this.REDIS.set(prizebreakupcacheName, JSON.stringify(this.prizeBreakUp));
                }
            }
            return this.prizeBreakUp;
        } catch (err) {
            console.log('Error while getting prize breakup', err);
            throw err
        }
    }

    async SaveContestPriceBreakupInCache(contestId) {
        const proc_name = "PROC_GET_ContestPrizeBreakup";
        const param = "@ContestId=" + contestId;
        var result = await this.uow.GetDataFromCasualGame(proc_name, param);
        return result;
    }

   async getContestDuration(contestId) 
   {    
       let contestDuration = 0;
        try
        {
            const proc_name = "PROC_GET_ContestDuration";
            const param = "@ContestId=" + contestId;
            var result = await this.uow.GetDataFromCasualGame(proc_name, param);
            if(result.length > 0)
                contestDuration = parseInt(result[0].GameDuration);
            
            return contestDuration;
        } catch (err) {
            console.log('Error while getting prize breakup', err);
            throw err
        }
   }

   async getLudoCompletedContestResponse(UserId){
        let result = [];
        try
        {
            const proc_name = "PROC_GET_Completed_GameContests";
            const param = "@UserId=" + UserId;
            result = await this.uow.GetDataFromCasualGame(proc_name, param);
        } catch (err) {
            console.log('Error while getting contest details', err);
            throw err
        }
        return result;
   }

   async getMyLudoRoomDetailsResponse(roomid, userid){
        let result = [];
        try
        {
            const proc_name = "PROC_GetRoomDetails";
            const param = "@UserId=" + userid + ", @RoomId=" + roomid;
            result = await this.uow.GetDataFromCasualGame(proc_name, param);
        } catch (err) {
            console.log('Error while getting room details', err);
            throw err
        }
        return result;
    }

    async getMyLudoRoomDetailsResponseForAdmin(roomid){
        let result = [];
        try
        {
            const proc_name = "PROC_GetRoomDetailsForAdmin";
            const param = "@RoomId=" + roomid;
            result = await this.uow.GetDataFromCasualGame(proc_name, param);
        } catch (err) {
            console.log('Error while getting room details', err);
            throw err
        }
        return result;
    }
}
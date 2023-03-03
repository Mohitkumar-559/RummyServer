
const {getContestbyId,getRabbitMQbytableID} = require("../../infra/Redis/redis-key")
const intialiseRedis = require('../../interfaces/redisConnection')
const SqlDB = require( "../../infra/Sql/Sql-interface");
const rabbitMQChannel = require("./rabbitmq.channel")

module.exports = class GetContest {

    redis = intialiseRedis.Instance._redis;
    getContestById = async(contestId)=>{
        const cacheKey = getContestbyId(contestId);
        const procName = "PROC_GET_GameContestsByContestId_V2";
        const procParam = `@ContestId=${contestId}`
        var contestData;
        // ioredis supports the node.js callback style
        contestData = await this.redis.get(cacheKey);
        
        
        if (!contestData) {
            let sql = new SqlDB();
            let resp = await sql.GetDataFromCasualGame(procName, procParam);
            if (!resp) {
                throw new BaseHttpResponse(null,"No contest found", ERROR_CODE.DEFAULT)
            }
            contestData = resp;
            await this.redis.set(cacheKey, contestData);
        }
        
        return contestData;
    }

    setRabbitMQData = async(tableId)=>{
        const cacheKey = getRabbitMQbytableID(tableId);
        var rabbitMQData={
            tableId:tableId,
            status: rabbitMQChannel.RECIVED
        }
        // iothis.redis supports the node.js callback style
        let rabbitData = await this.redis.hmset(cacheKey, rabbitMQData);
        
        
        return rabbitData;
    }
    
}



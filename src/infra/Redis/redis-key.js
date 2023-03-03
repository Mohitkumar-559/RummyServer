const {GAME_TYPES} = require('../../domain/constants/game-type')
    function getNodeEnv(gameMode) {
        if(parseInt(gameMode) == GAME_TYPES.POINT){
            return process.env.NODE_ENV
        }
        if(parseInt(gameMode) == GAME_TYPES.DEAL){
            return process.env.NODE_ENV_DEAL
        }
    }
    
    function getServerKey(serverIp,gameMode){
        return `{${serverIp}}_server_detail_${getNodeEnv('1')}`;
    }

    function getActiveServerKey(gameMode){
        return `active_servers_${getNodeEnv('1')}`
    }

    function getRunningGameKey(serverIp,gameMode){
        return `{${serverIp}}_running_game_${getNodeEnv('1')}`;
    }

    function getProfileKey(profileId){
        return `{${profileId}}_profile_data_${getNodeEnv('1')}`
    }

    function getContestDetailKey(contestId,gameMode){
        return `${getNodeEnv(gameMode)}_Contest:ContestDetailsById`
    }
    function ContestCategorization(gameId,gameMode){
        return `${getNodeEnv(gameMode)}_Contest:Categorization:Game:${gameId}`
    }

    function ContestDetails(gameId,gameMode){
        return `${getNodeEnv(gameMode)}_Contest:ContestDetails:${gameId}`
    }
    function ContestDetailsDeals(gameId,gameMode){
        return `${getNodeEnv(gameMode)}_Contest:ContestDetails:${gameId}`
    }

    function  PracticeContestUser(userId,gameMode){
        return `${getNodeEnv(gameMode)}_PracticeContestUser:${userId}`
    }

    function  ContestPrizeBreakUp(contestId,gameMode){
        return `${getNodeEnv(gameMode)}_Contest:PriceBreakup:Contest:${contestId}`
    }

    function  JoinedContestCount(gameId,gameMode){
        return `${getNodeEnv(gameMode)}_JoinedContestCount:${gameId}`
    }

    function  AppGameSetting(gameMode){
        return `${getNodeEnv(gameMode)}_AppGameSetting:getappgamesetting`
    }
    function getContestbyId(gameMode){
        return `${getNodeEnv(gameMode)}_Contest:ContestDetails:4`
    }
    function getRabbitMQbytableID(tableId, gameMode){
        return `${getNodeEnv('1')}:rabbitMqMsg:${tableId}`
    }
    async function getPlayerJoinCounter(){
        let redisKey = RedisKeys.contestRoomCounter();
        return await redis.hgetall(redisKey);
    }
    function noOpponentCounter(gameMode){
        return `${getNodeEnv(gameMode)}:noOpponentCounter`
    }

module.exports={
    getServerKey,
    getActiveServerKey,
    getRunningGameKey,
    getProfileKey,
    getContestbyId,
    AppGameSetting,
    JoinedContestCount,
    ContestPrizeBreakUp,
    PracticeContestUser,
    ContestDetails,
    ContestCategorization,
    getRabbitMQbytableID,
    getContestDetailKey,
    getPlayerJoinCounter,
    noOpponentCounter,
    ContestDetailsDeals
};

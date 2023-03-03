"use strict";

const { TABLE_WAITING_SECONDS } = require("../constants/timers");

let gameClient = require("../../infra/Redis/game-client").gameRedisClient();
exports.saveGameRedis = async (gameKey, expireTime, redisTable) => {
     const resp = await gameClient
          .multi()
          .hmset(gameKey, redisTable)
          .pexpire(gameKey, expireTime)
          .exec();
     return resp;
}

exports.getAllGameData = async (gameKey) => {
     return await gameClient.hgetall(gameKey);
}
exports.randomMemberWaiting = async (waitingKey, count = 10) => {
     return await gameClient.srandmember(waitingKey, count)
}
exports.removeWaitingMember = async (waitingKey, gameId) => {
     return await gameClient.srem(waitingKey, gameId);
}
exports.lockUpdateGame = async (gamekey, redisTable) => {
     try {
          const client = require("../../infra/Redis/game-client").gameRedisClient();
          const lock = await client.watch(gamekey);
          console.info("Lock", lock);
          const resp = await client.pipeline()
               .persist(gamekey)
               .hmset(gamekey, redisTable)
               .pexpire(TABLE_WAITING_SECONDS)
               .exec();
          return resp;
     } catch (error) {
          console.error("lockUpdateGame ", error);
     }


}
"use strict";
const intialiseRedis = require("../../interfaces/redisConnection")
exports.gameRedisClient = () => {
     let client;
     client = intialiseRedis.Instance._redis;
     client.on('connect', function (err) {
          console.log("matchMakingRedisClient global connected : ");
     });

     client.on("error", function (err) {
          console.log("matchMakingRedisClient global Error : ", err);
     });
     return client;
}
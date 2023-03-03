"use strict";
exports.redisPubSubClient = () => {
     let client;
     const redis = require('redis');
     client = redis.createClient(process.env.REDIS_URL);

     client.on('connect', function (err) {
          console.log("PUBSUB global connected : ");
     });

     client.on("error", function (err) {
          console.log("PUBSUB global Error : ", err);
     });
     return client;
}
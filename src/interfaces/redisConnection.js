const Redis = require("ioredis");
const { noOpponentCounter } = require("../infra/Redis/redis-key")


module.exports = class intialiseRedis {
    _redis;
    constructor(){
       this._redis = new Redis(process.env.REDIS_URL);
    }
    static get Instance() { 
        if (!this._instance) {
            this._instance = new intialiseRedis()
        }
        return this._instance;
    }
    get RedisConnection() {
        return this._redis;
    }

    async incNoOpponentCounter(date, inc){
        return await this._redis.hincrby(noOpponentCounter(), date, inc);
    }
    

}
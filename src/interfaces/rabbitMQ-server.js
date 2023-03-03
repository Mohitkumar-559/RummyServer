const {RabbitMQ} = require("./queue.context")
const Transaction= require("../infra/Sql/methods/transaction")
const intialiseRedis = require('../interfaces/redisConnection')

module.exports = class intializeRabbitMQ {
    _rabbitMq;
    _transaction;
    _rummyService;
    _redis;
    static _instance;
    constructor(){
        this._rabbitMq= new RabbitMQ()
        this._transaction = new Transaction();
        this._redis = intialiseRedis.Instance._redis;
        
    }
    static get Instance() { 
        if (!this._instance) {
            this._instance = new intializeRabbitMQ()
        }
        return this._instance;
    }
    get RabbitMQ() {
        return this._rabbitMq;
    }
    get Transaction() {
        return this._transaction;
    }
    get RedisConnection() {
        return this._redis;
    }
}

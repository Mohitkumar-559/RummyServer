const EXPIRE_TIME = 100000
 class GameServices {
    _gameRedis 
    constructor(gameRedis) {
        this._gameRedis = gameRedis;
      }
      static async createGameEntryOnStart(redisData) {
        const redisAck  = await this._gameRedis.hmset(mongoData._id, redisData, EXPIRE_TIME);
        return {redisAck};
      }
      static async createGameEntryOnEnd(redisData) {
        const redisAck  = await this._gameRedis.hmset(mongoData._id, redisData, EXPIRE_TIME);
        return {redisAck};
      }

      static async syncGameState(gameId, data) {
        // gameLog(gameId, 'Last sync state =>',data);
        return await this._gameRedis.hmset(gameId, data, EXPIRE_TIME);
      }

      static async getFullGameState(gameId) {
        return await this._gameRedis.hgetall(gameId);
      }

      static async getPartialGameState(gameId, keys) {
        return await this._gameRedis.hmget(gameId, keys);
      }

      static async updateGameEntryOnEnd(gameId, redisData) {
        await this._gameRedis.hmset(gameId, redisData, EXPIRE_TIME);
      }
}
module.exports={GameServices}
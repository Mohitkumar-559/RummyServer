const sql = require("mssql");
const loggerError = require('../../utils/logger')
module.exports = class SqlDB {
    casualDbConnection=sql.ConnectionPool;
    transactionDbConnection=sql.ConnectionPool;
    _instance;
    MAX_RETRY = 1;
    constructor() {
    }
    static get Instance(){
      if(!this._instance){
        this._instance = new SqlDB();
      }
      return this._instance;
    }
    async getCasualDb(roomId) {
        if (!this.casualDbConnection || !this.casualDbConnection.connected) {
              loggerError.gameLog("DB_connect", 'creating new connection', this.casualDbConnection);
              this.casualDbConnection = await new sql.ConnectionPool(process.env.GAME_DB_CONN).connect().then(pool => {
              return pool;
            });
        }
        return this.casualDbConnection;
    }

    async getTransactionDb() {
        if (!this.transactionDbConnection || !this.transactionDbConnection.connected) {
            this.transactionDbConnection = await new sql.ConnectionPool(process.env.TRANSACTION_DB_CONN).connect().then(pool => {
                return pool;
            });
        }
        return this.transactionDbConnection;
    }


    async GetDataFromCasualGame(proc_name, param) {
        let recordList = [];
        try {
            let query = "EXEC " + proc_name + " " + param;
            const result = await (await this.getCasualDb('noroom')).query(query)
            recordList = result.recordset;
        }
        catch (err) {
            console.log(err);
        }
        return recordList;
    }
    async GetDataFromTransaction(proc_name, param) {
        let recordList= [];
        try {
            let query = "EXEC " + proc_name + " " + param;
            const result = await (await this.getTransactionDb()).query(query)
            recordList = result.recordset;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
        return recordList;
    }

    async DeductMoneyForRummy(proc_name, obj, tbl, retry = 0) {
      let _List = []
      try {
        if(retry>this.MAX_RETRY){
          return [];
        }
        retry++
        let connetion = await this.getTransactionDb();
        const request = new sql.Request(connetion);
        request.input('GameId', sql.BigInt, obj.GameId)
        request.input('ContestId', sql.BigInt, obj.ContestId)
        request.input('CategoryId', sql.BigInt, obj.CatId)
        request.input('Amount', sql.Float, obj.Amount)
        request.input('GameTypeId', sql.Int, obj.GameTypeId)
        request.input('MaxBonusAllowed', sql.Float, obj.MaxBonusAllowed)
        request.input('GameServerId', sql.VarChar, obj.GameServerId)
        request.input('dtUserList', sql.TVP, tbl)
        console.log('PROC DATA', request)
        const result = await request.execute(proc_name);

  
        _List = result.recordset;
  
        
      }
      catch (err) {
        this.DeductMoneyForRummy(proc_name, obj, tbl, retry);
        loggerError.gameLog(obj.GameId.toString(), 'Connection error log in deduct ', err);
              
        console.log(err);
      }
      return _List;
    }

    async createRoomForRummy(proc_name, obj, tbl, retry = 0) {
      let recordList = [];
        try {
            // let query = "EXEC " + proc_name + " " + param;
            // const result = await (await this.getCasualDb('noroom')).query(query)
            // recordList = result.recordset;
        
          if(retry>this.MAX_RETRY){
            return [];
          }
          retry++
          let connetion = await this.getCasualDb();
          const request = new sql.Request(connetion);
          request.input('ContestId', sql.BigInt, obj.ContestId)
          request.input('GameServerId', sql.VarChar, obj.GameServerId)
          request.input('dtRummyRoomParticipants', sql.TVP, tbl)
          const result = await request.execute(proc_name);
    
          recordList = result.recordset;
    
          
        }
        catch (err) {
          this.createRoomForRummy(proc_name, obj, tbl, retry);
          loggerError.gameLog(proc_name, 'Connection error log in deduct ', err);
                
          console.log(err);
        }
        return recordList;
    }


    async GetDataForContestWinners(proc_name, contestId, roomId, tbl, retry = 0) {
      let winnerList = []
      try {
        if(retry>this.MAX_RETRY){
          return [];
        }
        retry++
        let connetion = await this.getCasualDb(roomId.toString());
        const request = new sql.Request(connetion);
        request.input('RoomId', sql.BigInt, roomId)
        request.input('ContestId', sql.BigInt, contestId)
        request.input('dtDealRummyParticipantsScore', sql.TVP, tbl)
        const result = await request.execute(proc_name);
  
        winnerList = result.recordset;
  
        loggerError.gameLog(roomId.toString(), 'Recordset in get contest winner ', result.recordset);
      }
      catch (err) {
        this.GetDataForContestWinners(proc_name, contestId, roomId, tbl, retry);
        loggerError.gameLog(roomId.toString(), 'Connection error log in get contest winner ', err);
              
        console.log(err);
      }
      return winnerList;
    }
  
    async RefundToUser(proc_name, tbl) {
      let refundStatusList = []
      try {
        let connetion = await this.getTransactionDb()
  
        const request = await new sql.Request(connetion);
        request.input('dtRefundedRummyUser', sql.TVP, tbl)
        const result = await request.execute(proc_name);
  
        refundStatusList = result.recordset;
      }
      catch (err) {
        console.log(err);
        }
        return refundStatusList;
      }

}
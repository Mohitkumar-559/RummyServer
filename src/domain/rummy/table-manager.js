"use strict";

const {waitingTable} = require('../game/service')
const loggerError = require("../../utils/logger")
let runningTables = {};
let dealRound = {};
//let runningTablesForMatch = {};
exports.distroyTable = (tableId)=>{
     loggerError.Log('memoryLog', 'Deleting table in runningTable and waitingTable', tableId, 'Total running table=', Object.keys(runningTables).length, 'Total waiting table=', Object.keys(waitingTable).length)
     delete runningTables[tableId];
     delete waitingTable[tableId];
     loggerError.Log('memoryLog', 'Table deleted in runningTable ', tableId, 'Total running table=', Object.keys(runningTables).length, 'Total waiting table=', Object.keys(waitingTable).length)
}

exports.setTable = (table) => {
     loggerError.Log('memoryLog', 'Adding table in runningTable ', table._id || table.tableId, 'Total running table=', Object.keys(runningTables).length)
     runningTables[table._id || table.tableId] = table;
     loggerError.Log('memoryLog', 'Table added in runningTable ', table._id || table.tableId, 'Total running table=', Object.keys(runningTables).length)
     
     //console.log("Running tables", runningTables);
}
// exports.setTableForMatch = (table) => {
//      runningTablesForMatch[table._id || table.tableId] = table;
//      //console.log("Running tables", runningTablesForMatch);
// }

// exports.getTableForMatch = async (tableId)  => {
//      //check the table contain the tableid in mongodb
//      if(runningTablesForMatch[tableId])
//      {
//           return runningTablesForMatch[tableId];
//      }
//      else if(waitingTable[tableId]){

//           return waitingTable[tableId]
//      }
//      else{
//           return false;
//      }
     
     
// }
exports.getTable = (tableId) => {
     //console.log("\n \n getTables ", runningTables)
     if(runningTables[tableId])
     {
          loggerError.gameLog(tableId,"Running table data -===socket")
          return runningTables[tableId];
     }
     
}
exports.getTableWaitingTable = (tableId) => {
     //console.log("\n \n getTables ", runningTables)
     if(waitingTable[tableId])
     {
          loggerError.gameLog(tableId,"Fetching waiting table", waitingTable[tableId])
          return waitingTable[tableId];
     }
     
}


exports.getTableState = (tableId) => {
     return runningTables[tableId].gameState
}

exports.setDealRound = (table) => {
     dealRound[table._id || table.tableId] = table;
     loggerError.Log('memoryLog', 'Table added in dealround Table ', table._id || table.tableId, 'Total deal rummy table=', Object.keys(dealRound).length)
     
     //console.log("Running tables", runningTables);
}
exports.getDealRound = (tableId) => {
     if(dealRound[tableId]){
          return dealRound[tableId]
     }
     else{
          return false
     }
     //return dealRound[tableId].round;
     //loggerError.Log('memoryLog', 'Table added in dealround Table ', dealRound[tableId]._id || dealRound[tableId].tableId, 'Total deal rummy table=', Object.keys(dealRound).length)
     //console.log("Running tables", runningTables);
}
exports.distoryDealRound = (tableId) => {
     
     loggerError.Log('memoryLog', 'Table added in dealround Table ', dealRound[tableId]._id || dealRound[tableId].tableId, 'Total deal rummy table=', Object.keys(dealRound).length)
     delete dealRound[tableId].round;
     //console.log("Running tables", runningTables);
}
exports.isTableExpired = (table) => {
     return ((Date.now() - table.createdOn) > 45000)
}

// exports.fetchTableStateRedis = async (gameId)=> {    
//      const table = await GameServices.getFullGameState(gameId);
//      gameLog(gameId, 'Fetching table from redis', table)
//      // && table.state == GameState.RUNNING
//      if (table ) {
//          const game = this.createTable(table);
//          if(table.state == GameState.RUNNING){
//              game.initTableOnRestart(table);
//          }
//          return game;
//      }
//  }


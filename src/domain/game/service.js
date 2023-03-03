
"use strict";
const mongoose = require("mongoose");
const { PLAYER_STATE, GAME_STATES } = require("../constants/game-type");
const {  GAME_TURN_TIME_SECONDS } = require("../constants/timers");
const { redisKeys } = require("../shared");
const {  getAllGameData, lockUpdateGame } = require("./client");

const repo = require("./repo");
const validator = require("./validator");
const loggerError = require("../../utils/logger")


const createWaitingGameString = (gameType, roomMode, playerCount, betValue) => {
     return "" + gameType + roomMode + playerCount + betValue;
}

const waitingTables = {};
exports.checkWaitingTables = async (gId, cId) => {
     setTimeout(() => {
          if (waitingTables[cId]) {
               delete waitingTables[cId];
          }
     }, GAME_START_TIME_AFTER_JOIN);

}
exports.onCreateGame = (gId, cId, metaData, player) => {
     const table = createTable(gId, cId, metaData, player);
     validator.gameSchema(table);
     // if(waitingTables[cId]) {
     //      waitingTables[cId].push(table);
     // }
     // else{
     //      waitingTables[cId] = [table];
     // }
     if (!waitingTables[gId]) {
          loggerError.Log('memoryLog', 'Adding table in waitingTable ', gId, 'Total waiting table=', Object.keys(waitingTables).length)
          waitingTables[gId] = table;
          loggerError.Log('memoryLog', 'Table added in waitingTable ', gId, 'Total waiting table=', Object.keys(waitingTables).length)
     }
     const redisTable = module.exports.stringifyGameData(table);
     // //console.log("redis table ", redisTable);
     // const gameKey = redisKeys.gameHashKey(table._id);
     // const resp = await saveGameRedis(gameKey, GAME_EXPIRE_SECONDS, redisTable);
     // //  module.exports.onLeaveGame(table._id, player.userId);
     // await repo.saveData(table);
     //setTimeout(module.exports.onLeaveGame,10000,table._id,player.userId);
     return table;
}

const onMatchMakingTimeEnd = async (gameId) => {

}

exports.parseGamePlayerInfo = (player, gId) => {
     const p = {
          _id: gId,
          name: player.name || "p-1",
          pState: PLAYER_STATE.WAITING,
          userId: player.userId || "1",
          DID: player.DID,
          MID: player.MID,
          REFER_CODE: player.REFER_CODE

     };
     return p;
}
const createTable = (gId, cId, metaData, player) => {


     const table = {
          _id: gId || new mongoose.Types.ObjectId().toString(),
          metaData: metaData,
          players: [module.exports.parseGamePlayerInfo(player, gId)],
          processId: "PROCESS_ID",
          turnNo: 0,
          currentTurnIndex: 0,
          gameState: GAME_STATES.WAITING,
          turnTime: GAME_TURN_TIME_SECONDS,
          contestId: cId,
          gameId: gId,
          createdOn: Date.now()
     };
     console.info("createTable ", table);
     return table;
}
exports.stringifyGameData = (table) => {
     const stringifyData = {
          _id: table._id,
     }
     if (table.metaData) {
          stringifyData.metaData = JSON.stringify(table.metaData);
     }
     if (table.players) {
          stringifyData.players = JSON.stringify(table.players);
     }
     if (table.processId) {
          stringifyData.processId = table.processId;
     }
     if (table.turnNo) {
          stringifyData.turnNo = table.turnNo;
     }
     if (table.currentTurnIndex) {
          stringifyData.currentTurnIndex = table.currentTurnIndex;
     }
     if (table.gameState) {
          stringifyData.gameState = table.gameState;
     }
     if (table.turnTime) {
          stringifyData.turnTime = table.turnTime;
     }
     if (table.contestId) {
          stringifyData.contestId = table.contestId;
     }
     return stringifyData;
}
exports.parseGameData = (table) => {
     const parsedData = {
          _id: table._id,
          metaData: JSON.parse(table.metaData),
          players: JSON.parse(table.players),
          processId: table.processId,
          turnNo: parseInt(table.turnNo),
          currentTurnIndex: parseInt(table.currentTurnIndex),
          gameState: parseInt(table.gameState),
          turnTime: parseInt(table.turnTime),
          contestId: table.contestId
     }
     return parsedData;
}
exports.getGameData = async (gameId) => {
     const gameKey = redisKeys.gameHashKey(gameId);
     const table = await getAllGameData(gameKey);
     console.info("getGameData ", table);
     if (table && table._id) {
          return module.exports.parseGameData(table);
     }
}
exports.deleteWaitingList = async (gameid) => {
     loggerError.Log('memoryLog', 'Deleting table in waiting table', gameid, 'Total waiting table=', Object.keys(waitingTables).length)
     delete waitingTables[gameid];
     loggerError.Log('memoryLog', 'Table deleted from waiting table', gameid, 'Total waiting table=', Object.keys(waitingTables).length)
     
     
}

exports.onSearchGame = (cId, player) => {
     //how we are taking waitingTable as Array where its initalized as object
     try {
          if (waitingTables[cId]) {
               // for (let i = 0; i < waitingTables[cId].players.length; i++) {
               const table = waitingTables[cId];
               console.log("==========",table)
               // if (table.gameState != 1) {
               //      continue;
               // }
               let isUnique = true;
               table.players.forEach(p1 => {
                    if (p1.userId == player.userId) {
                         isUnique = false;
                    }
               });
               if (isUnique == false) {
                    loggerError.gameLog(cId, "User already joined in this table", player)
                    throw new Error("User already in the game");
               }
               table.players.push(player);

               if (table.players.length == table.metaData.playerCount) {
                    table.gameState = 2;
                    table.isRunning = true;
                    table.joinStart = false;
                    
                    //delete waitingTables[cId];

                    //update the table in mongodb

                    }
                    repo.updateOne({ _id: table._id }, table);

               // const gameKey = redisKeys.gameHashKey(table._id);
               // const redisTable = module.exports.stringifyGameData(table);
               // //updating the data in the radis about the lock the table with key
               // const response = await lockUpdateGame(gameKey, redisTable);
               return table;
               // }
          }
     } catch (error) {
          console.log(error)
     }

     return false;
}

exports.onSearchGameById = async (gId, metaData, player) => {
     //how we are taking waitingTable as Array where its initalized as object
     if (waitingTables[gId]) {
          const table = waitingTables[gId];
          console.log("waitingTables[" + cId + "][" + i + "]", waitingTables[gId]);
          if (table.gameState != GAME_STATES.WAITING) {
               return false;
          }
          let isUnique = true;
          table.players.forEach(p1 => {
               if (p1.userId == player.userId) {
                    isUnique = false;
               }
          });
          if (isUnique == false) {
               return false;
          }
          table.players.push(player);
          if (table.players.length == table.metaData.playerCount) {
               table.gameState = GAME_STATES.RUNNING;
               table.isRunning = true;
               waitingTables[cId].splice(i, 1);
          }
          const gameKey = redisKeys.gameHashKey(table._id);
          const redisTable = module.exports.stringifyGameData(table);
          //updating the data in the radis about the lock the table with key
          const response = await lockUpdateGame(gameKey, redisTable);
          return table;

     }
     return false;
}

// const waitingKey = redisKeys.waitingMatchSet(createWaitingGameString(metaData.gameType, metaData.roomMode, metaData.playerCount, metaData.betValue));
// for (const gameId of await randomMemberWaiting(waitingKey, 1000)) {
//      // console.info("onSearchGame 1 ", gameId);
//      const gameKey = redisKeys.gameHashKey(gameId);
//      const table = await module.exports.getGameData(gameId);
//      console.info("onSearchGame 2 ", table);
//      if (table == undefined || table.gameState == undefined) {
//           const rmv = await removeWaitingMember(waitingKey, gameId);
//           console.log("Removing ", waitingKey, gameId, rmv);
//      }
//      else if(table.gameState == GAME_STATES.FINISHED){
//           const rmv = await removeWaitingMember(waitingKey, gameId);
//           console.log("Removing ", waitingKey, gameId, rmv);
//      }
//      else if (table.gameState != GAME_STATES.WAITING) {
//           continue;
//      }
//      else {
//           let isUnique = true;
//           table.players.forEach(p1 => {
//                if(p1.userId == player.userId) {
//                     isUnique = false;
//                }
//           });
//           if(isUnique == false) {
//                continue;
//           }
//           table.players.push(player);
//           if (table.players.length == table.metaData.playerCount) {
//                table.gameState = GAME_STATES.RUNNING;
//                table.isRunning = true;
//           }
//           const redisTable = module.exports.stringifyGameData(table);
//           const response = await lockUpdateGame(gameKey, redisTable);
//           return table;
//      }
// }
exports.timeout = (ms) => {
     return new Promise(resolve => setTimeout(resolve, ms));
}

exports.updateGameOnEnd = async (gameId, gameData) => {
     const gameKey = redisKeys.gameHashKey(gameId);
     const redisTable = module.exports.stringifyGameData(gameData);
     const response = await lockUpdateGame(gameKey, redisTable);
     const mongo = await repo.updateOne({ _id: gameId }, gameData, { lean: true, new: true });
     return;
}

exports.onLeaveGame = async (gameId, userId) => {
     console.log("onLeaveGame gameid ", gameId);
     const game = await module.exports.getGameData(gameId);
     const cId = game.contestId;
     if (waitingTables[cId]) {
          let indexToRemove = -1;
          for (let i = 0; i < waitingTables[cId].length; i++) {
               const table = waitingTables[cId][i];
               if (table._id != gameId) {
                    continue;
               }
               game.gameState = GAME_STATES.DESTROYED;
               indexToRemove = i;
               const index = table.players.findIndex(p => p.userId == userId);
               console.log("onLeaveGame table before ", table);
               if (index >= 0) {
                    table.players.splice(index, 1);
               }

               console.log("onLeaveGame table after ", table);
               const gameKey = redisKeys.gameHashKey(gameId);
               const redisTable = module.exports.stringifyGameData(table);
               const response = await lockUpdateGame(gameKey, redisTable);
               return true;
          }
          waitingTables[cId].splice(indexToRemove, 1);
     }
     console.log("onLeaveGame False ", cId, gameId, userId);
     return false;
}

exports.waitingTable = waitingTables;
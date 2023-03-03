"use strict";
const economy = require("../../webhooks/economy");
const GetContest =require("../../user/contest.details")
exports.createRoomIds = (tableId, userId) => {
     let roomId = "";
     if (tableId) {
          roomId = tableId;
     }
     if (userId) {
          roomId += userId;
     }
     return roomId;
}

exports.checkUserBalance = async (userId, amount) => {
     const playerBalance = await economy.getPlayerBalance(userId);
     ////////console.info("playerBalance ", playerBalance);
     if (playerBalance.Balance < amount) {
          return false;
     }
     return true; 
}

exports.deductUserBalance = async (contestId,token,gameId) => {
     console.log("\n deductUserBalance fees ",token,gameId,contestId);
     const contestInfo = await getContestDetails(contestId);
     const {joiningFees, bonus } = await getJoiningFeesBonus(contestInfo);
     console.log("\n joining fees ", joiningFees, bonus);
     const resp =  await economy.deductPlayerBalance(token,joiningFees,gameId,bonus);
     console.log("deductUserBalance ", resp);
     return resp;
}

const getContestDetails = async (contestId)=>{
     //const data = await service.getLobbyConfig(contestId);
     let getContest_ = new GetContest();
     const data = await getContest_.getContestById(contestId)
     
     console.log("getContestDetails ", data);
     const resp = {
          pointValue: parseInt(data.pointsvalue),
          playerCount: parseInt(data.noofplayers),
          totalPoints: parseInt(data.maxpoints),
          commisionPerc: parseInt(data.commisionpercent),
          discountPerc : parseInt(data.discountpercent),
          bonusPerc : parseInt(data.bonuspercent)
     }
     //console.log("parsed getContestDetails ", resp);
     return resp;
}
const contestCalculations = async(contestId, loserScore)=>{
     const {pointValue, playerCount, totalPoints, commisionPerc, discountPerc, bonusPerc} = await getContestDetails(contestId);
     let won,lose,potValue,joiningFees,platformFees,returnAmt, bonusAmt, discountAmt,returnAfterDiscountAndBonus;
     joiningFees = pointValue*totalPoints;
     lose = loserScore * pointValue; 
     //console.log("\n lose ", lose);
     //console.log("\n commisionPerc ", commisionPerc);
     platformFees = (lose/100)*commisionPerc;
     //console.log("\n platformFees ", platformFees);
     won = lose - platformFees;
     potValue = joiningFees*playerCount;
     returnAmt = joiningFees - lose;
     bonusAmt = (lose/100)*bonusPerc;
     discountAmt = (lose/100)*discountPerc;
     returnAfterDiscountAndBonus = returnAmt + bonusAmt + discountAmt;
     //console.log("won ", won);
     //console.log("returnAfterDiscountAndBonus ", returnAfterDiscountAndBonus);
     return {
          joiningFees,
          won,
          returnAfterDiscountAndBonus
     }
}

const getJoiningFeesBonus = async(contestInfo)=>{
     const joiningFees = contestInfo.pointValue*contestInfo.totalPoints;
     const bonus = (joiningFees/100)*contestInfo.bonusPerc;
     return {joiningFees, bonus} 
}

exports.addUserBalance = async (contestId, token,gameId, hasWon, loserScore)=>{
     const contestCal = await contestCalculations(contestId, loserScore);
     //console.log("\n contestCalculations ", contestCal);
     let resp;
     if(hasWon) {
          await economy.addPlayerBalance(token,contestCal.won,gameId,2);
          return contestCal.won;
     }
     else{
          await economy.addPlayerBalance(token,contestCal.returnAfterDiscountAndBonus,gameId,1);
          return contestCal.returnAfterDiscountAndBonus;
     }
     // ////////console.info("contestCalculations Resp ", resp);
     // return resp;
     // return contestCal;
}

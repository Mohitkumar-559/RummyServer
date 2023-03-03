"use strict";
const mongoose = require("mongoose");
const { PLAYER_STATE, GAME_STATES, ROOM_MODE,GAME_TYPES,GAME_MODE } = require("../constants/game-type");
const { customError } = require("../shared");
const { socketEvents } = require("../socket/events");
const commonFunctions = require("../socket/controllers/common-functions");
const { distroyTable,setTable, setDealRound, getDealRound,distoryDealRound } = require("./table-manager");
const intializeRabbitMQ = require("../../interfaces/rabbitMQ-server");
const loggerError = require('../../utils/logger')
const DECLARE_TIME = 40000
const {activeGame} = require("../../interfaces/queue.context")
 


class Rummy {
     constructor(tableId, players = [], emitRoom, contestId, roomId, WalletTransactionArray, metaData, xfac = null) {
          this.room_mode = ROOM_MODE.CASH
          activeGame.inc();
          console.log("Rummy contrcutor called");
          this.Botmield = [];
          this.contestId = parseInt(contestId);
          if (this.contestId < 1) {
               this.room_mode = ROOM_MODE.PRACTICE
          }
          this.WalletTransactionArray = WalletTransactionArray
          this.playerToss = [];
          this._id = tableId;
          this.tableId = tableId;
          this.currentTurnIndex = 0;
          this.cardRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
          this.suits = ['spade', 'heart', 'diamond', 'club'];
          this.deck = [];
          this.deckForToss = [];
          this.draw = [];
          this.drawnCard; // set on draw action , reset on discard
          this.hands = {};
          this.players = players;
          this.turnState = "toss" // cardPickedUp, cardPlayed/sync cards, finish then declare, discardCard(change turn), end
          this.gameState = GAME_STATES.WAITING;
          this.finishedByIndex;
          this.finishedOn;
          this.cardsMap = new Map();
          this.totalTurnTime = 30000;
          this.lastTurnTime = Date.now();
          this.timer;
          this.autodeclareTimer;
          this.bottimer;
          this.botDicardTimer;
          this.onFireEventToRoom = emitRoom;
          this.wildCard;
          this.turnCount = 0;
          this.lastTurnTimeMilli = 0;
          this.declaredArr = [];
          this.firstdeclared = '';
          this.bot_declare = false;
          this.botplayerIndex = 1
          this.metaData = metaData;
          this.gameModeX = metaData.gameMode || GAME_MODE.NORMAL
          this.totalRoundTime = process.env.DEAL_RUMMY_ROUND_TIME
          this.lastRoundTime = Date.now();
          this.gameMode = metaData.gameMode
          this.xFac = xfac
          // this.onFireEventToRoom(tableId,"joined",{ok:true});
          this.result = [];
          this.recentPickedCard = [];
          this.numberofExit = 0;
          this.round=0;
          this.dealresult = 1;
          
          this.roomId = parseInt(roomId);
          this.isResult=false;
          this.initDeck();
          //this.toss();
          this.tossV2();
          this.initPlayerCards();



     }

     getWinningUserData(result) {
          var data = {
               RoomId: this.roomId,
               ContestId: this.contestId,
               participantScores: [],
               IsPrivate: false
          };
          data.participantScores = result.rummyParticipantScore
          return data
     }
     updateLastTurnTime() {
          this.lastTurnTimeMilli = Date.now();
     }
     genRandom(low, high, exclue) {
          const num = Math.ceil(Math.random() * (high - low) + low);
          if (num == exclue) {
               return this.genRandom(low, high, exclue);
          }
          return num;
     }
     genrateRandomCard(excludeValue) {
          let randomIndex = this.genRandom(0, this.deckForToss.length - 1);
          let card = this.deckForToss[randomIndex];
          if (card.value == 0) {
               card.value = 13;
          }
          if (excludeValue && card.value == excludeValue) {
               card = this.genrateRandomCard(card.value);
          }
          return card;
     }
     tossV2() {
          this.playerToss=[]
          this.isResult=false;
          let p1Card = this.genrateRandomCard();
          let p2Card = this.genrateRandomCard(p1Card.value);
          if (p1Card.value > p2Card.value) {
               const p1Player = {
                    index: 0,
                    userId: (this.players[0].userId).toLowerCase(),
                    name: this.players[0].name,
                    card: p1Card,
                    won: true,
               };
               const p2Player = {
                    index: 1,
                    userId: (this.players[1].userId).toLowerCase(),
                    name: this.players[1].name,
                    card: p2Card,
                    won: false,
               };
               this.currentTurnIndex = 0;
               this.playerToss.push(p1Player);
               this.playerToss.push(p2Player);
          } else {
               const p1Player = {
                    index: 0,
                    userId: (this.players[0].userId).toLowerCase(),
                    name: this.players[0].name,
                    card: p1Card,
                    won: false,
               };
               const p2Player = {
                    index: 1,
                    userId: (this.players[1].userId).toLowerCase(),
                    name: this.players[1].name,
                    card: p2Card,
                    won: true,
               };
               this.currentTurnIndex = 1;
               this.playerToss.push(p1Player);
               this.playerToss.push(p2Player);
          }
          this.sendLogInMongo("toss", this.playerToss)

          console.log("---------------toss---------------------")
          //event cards
          if(this.round==0){
               this.playerToss.forEach((player)=>{
                    {
                         if(this.metaData.maxpoints != undefined || this.metaData.maxpoints!=NaN)
                         {
                              player.EarnCoin = parseInt(this.metaData.maxpoints)
                         }
                         else{
                              player.EarnCoin = 0
                         }
                    }
               })
               
          }
          else{
               let getround = getDealRound(this._id)
               let mapScore ={}
               for(let user of getround.players){
                    mapScore[user.userId]= user;
               }

               this.playerToss.forEach((player)=>{
                    this.players.forEach((realPlayer)=>{
                         if(player.userId==mapScore[player.userId].userId){
                              player.EarnCoin = mapScore[player.userId].EarnCoin;
                              
                         }
                         if(player.userId==realPlayer.userId){
                              realPlayer.EarnCoin = mapScore[player.userId].EarnCoin;
                              
                         }
                    })
                    
                    
               })
          }

          this.log('Sending toss resp to app ', this.playerToss)
          if(this.gameMode != GAME_TYPES.POINT)
          {
               this.metaData.playedRound = this.round+1;
          }
          this.round=this.round+1
          this.turnCount = 0
          console.log("toss player")
          console.log(this.playerToss), 
          console.log(this.roomId)
          console.log(this.metaData)
          this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, { eventCode: "toss", players: this.playerToss, roomId: this.roomId, metaData: this.metaData });
     }
     toss() {
          //creating toss for all game mode in table
          let play = [];
          let playcard = [];
          //let playerToss = {};
          let maxValue = 0;
          let exclude = this.genRandom(0, (this.deckForToss.length - 1))
          let indexofWon = 0;
          for (let index = 0; index < this.players.length; index++) {
               play[index] = this.genRandom(0, (this.deckForToss.length - 1), exclude);
               exclude = play[index]
               playcard[index] = this.deckForToss[play[index]];
               //check value for win toss
               let p1Player = {}
               if (playcard[index].value == 0) {
                    playcard[index].value = 14
               }
               if (playcard[index].value > maxValue) {
                    maxValue = playcard[index].value;
                    indexofWon = index;

               }
               if (playcard[index].value == maxValue && indexofWon != index) {
                    play[index] = this.genRandom(0, (this.deckForToss.length - 1), playcard[index].value);
                    playcard[index] = this.deckForToss[0];
                    if (playcard[index].value == 0) {
                         playcard[index].value = 13
                    }
               }
               p1Player = {
                    index: index,
                    userId: (this.players[index].userId).toLowerCase(),
                    name: this.players[index].name,
                    card: playcard[index],
                    won: false
               };
               //push player details on carddetails
               this.playerToss.push(p1Player);

          }
          if (maxValue > 0) {

               this.playerToss[indexofWon].won = true;
               this.currentTurnIndex = indexofWon;

          }
          // const p1 = this.genRandom(0,(this.deck.length-1));
          // const p2 = this.genRandom(0,(this.deck.length-1));
          // const p1card = this.deckForToss[p2];
          // const p2card = this.deckForToss[p1];
          // if(p1card.value > p2card.value) {
          //      const p1Player = {
          //           userId : this.players[0].userId,
          //           name : this.players[0].name,
          //           card : p1card,
          //           won : true,
          //      };
          //      const p2Player = {
          //           userId : this.players[1].userId,
          //           name : this.players[1].name,
          //           card : p2card,
          //           won : false,
          //      };
          //      this.currentTurnIndex = 0;
          //      this.playerToss.push(p1Player);
          //      this.playerToss.push(p2Player);
          // } else {
          //      const p1Player = {
          //           userId : this.players[0].userId,
          //           name : this.players[0].name,
          //           card : p1card,
          //           won : false,
          //      };
          //      const p2Player = {
          //           userId : this.players[1].userId,
          //           name : this.players[1].name,
          //           card : p2card,
          //           won : true,
          //      };
          //      this.currentTurnIndex = 1;
          //      this.playerToss.push(p1Player);
          //      this.playerToss.push(p2Player);
          // }
          this.sendLogInMongo("toss", this.playerToss)

          console.log("---------------toss---------------------")
          //event cards

          this.log('Sending toss resp to app ', this.playerToss)
          this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, { eventCode: "toss", players: this.playerToss, roomId: this.roomId, metaData: this.metaData });
          //return this.playerToss
     }
     onTimeoutRemovePickedupCard(playerIndex) {
          let cardId;
          const melds = this.players[playerIndex].melds;
          //console.log("onTimeoutRemovePickedupCard melds ", melds);
          for (let i = melds.length - 1; i >= 0; i--) {
               const cards = melds[i].cards || [];
               //console.log("cards", cards);
               if (cards.length) {
                    cardId = cards[cards.length - 1];
                    //console.log("cards", cards);
                    break;
               }
          }
          //console.log("\n cardId onTimeoutRemovePickedupCard ", cardId);
          return cardId;
     }
     async makeResultForOther(lastIndex) {
          try {
               //make all result for the player
               if (this.xFac) {
                    this.xFac.onOpponentExit();
               }
               let otherPlayerIndex = lastIndex;

               for (let i = 1; i < this.players.length; i++) {
                    console.log((otherPlayerIndex + i) % this.players.length)
                    otherPlayerIndex = (otherPlayerIndex + i) % (this.players.length);
                    let playerIndex = otherPlayerIndex;
                    //this.validateState(playerIndex, "declare");
                    let playerMelds = this.players[playerIndex].melds
                    let melds = JSON.parse(JSON.stringify(playerMelds))// {meldLocation:1,cards:[2,3,4], meldType: ""}
                    const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };
                    let playerScore = 0;
                    melds.forEach(meld => {
                         let cards = this.cardsInfo(playerIndex, meld.cards);
                         meld.cards = cards;
                         if (meld.meldType == "Sequence") {
                              validRules.impureSeq++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "impureSeq";

                         }
                         else if (meld.meldType == "Pure Sequence") {
                              validRules.pureSeq++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "pureSeq";
                         }
                         else if (meld.meldType == "Set") {
                              validRules.set++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "set";
                         }
                         else {
                              validRules.invalid++;
                              meld.score = this.calculateCardScore(cards);
                              playerScore = playerScore + meld.score;
                         }

                    });
                    if (otherPlayerIndex == lastIndex) {
                         playerScore = 20;
                         this.players[playerIndex].drop = "first";
                         if (this.players[playerIndex].turnNo > 0) {
                              playerScore = 40;
                              this.players[playerIndex].drop = "middle";
                         }
                         this.setPlayerResult(playerIndex, playerScore, validRules, melds);
                    }
                    else {
                         playerScore = 0
                         this.setPlayerResult(playerIndex, playerScore, validRules, melds);
                    }
                    loggerError.gameLog(this._id, "drop of the player " + playerIndex + ' score -' + playerScore + '-rules-set' + validRules.set + '-rules-sequence' + validRules.impureSeq + '-rules-pure-sequence' + validRules.pureSeq, this.players);

               }


          } catch (error) {
               console.log(error)
          }

     }
     async makeResultForOtherV2(opponentIndex) {
          try {


               //make all result for the player

               let playerMelds = this.players[opponentIndex].melds
               // let melds = JSON.parse(JSON.stringify(playerMelds))// {meldLocation:1,cards:[2,3,4], meldType: ""}
               const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };
               let playerScore = 0;
               // melds.forEach(meld => {
               //      let cards = this.cardsInfo(playerIndex, meld.cards);
               //      meld.cards = cards;
               //      if (meld.meldType == "Sequence") {
               //           validRules.impureSeq++;
               //           meld.isValid = true;
               //           meld.score = 0;
               //           meld.type = "impureSeq";

               //      }
               //      else if (meld.meldType == "Pure Sequence") {
               //           validRules.pureSeq++;
               //           meld.isValid = true;
               //           meld.score = 0;
               //           meld.type = "pureSeq";
               //      }
               //      else if (meld.meldType == "Set") {
               //           validRules.set++;
               //           meld.isValid = true;
               //           meld.score = 0;
               //           meld.type = "set";
               //      }
               //      else {
               //           validRules.invalid++;
               //           meld.score = this.calculateCardScore(cards);
               //      }

               // });
               this.setPlayerResult(opponentIndex, playerScore, validRules, playerMelds);
               loggerError.gameLog(this._id, "drop of the player " + opponentIndex + ' score -' + playerScore + '-rules-set' + validRules.set + '-rules-sequence' + validRules.impureSeq + '-rules-pure-sequence' + validRules.pureSeq, this.players);
          } catch (error) {
               console.log(error)
          }

     }
     async startTimer(stage) {
          this.timer = setTimeout(async () => {
               // set state as start, change currentturnindex, reset timers for next turn 
               try {
                    this.log('Turn timeout called ', this.players[this.currentTurnIndex].name, this.turnState);
                    if (this.turnState == 'finish') {
                         this.log('Turn state is finish on turn timeout');
                         return
                    }
                    const playerIndex = this.currentTurnIndex;
                    if (this.turnState == "cardPickedUp") {

                         const cardIdToRemove = this.onTimeoutRemovePickedupCard(playerIndex);
                         if (this.deck.length < 1) {
                              //fire finised event
                              await this.delay(2000);
                              let resp = await this.onFinishGame(userId, cardId, "Declare due to Cards is finised")
                              console.log("Game exit on deck finised \n ", resp.eventCode);
                              console.log("Game exit on declaration time to  finised \n ", resp.DECLARE_TIME);
                              this.log("Game exit on deck finised \n ==================")
                              this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, resp);
                              console.log("=================" + this.deck.length + " the length fire finise event")
                              return resp;
                         }
                         const card = this.removeCardFromPlayerHand(playerIndex, cardIdToRemove);
                         this.removeCardFromPlayerMelds(playerIndex, cardIdToRemove)
                         if (card) {
                              this.draw.unshift(card);
                         }
                         this.log('Player already have card in hand and we removed it', card);
                    }

                    this.turnState = "start";
                    let numberofplayer = this.players.length;
                    //console.log(this._id)
                    this.currentTurnIndex = (this.currentTurnIndex + 1) % (numberofplayer);
                    //     this.currentTurnIndex ^= 1;
                    this.lastTurnTime = Date.now();
                    this.turnCount += 1;
                    this.players[playerIndex].skipped += 1;
                    this.players[playerIndex].turnNo += 1;
                    if (this.players[playerIndex].skipped >= 3) {
                         this.isResult =true;
                         this.log('Player have 3 skips now ending game');

                         let playerScore
                         this.turnState = "finish";
                         const rules = {
                              pureSeq: 0, impureSeq: 0, set: 0, invalid: 0
                         }
                         this.log('Player exit from game ', this.players[playerIndex].name, 'Melds=<', this.players)
                         if(this.gameMode == GAME_TYPES.DEAL){
                              playerScore = await this.getLoserScoreOnExit(this.players[playerIndex].melds,playerIndex)
                              this.players[playerIndex].drop = "first";
                              if (this.players[playerIndex].turnNo > 0) {
                                   this.players[playerIndex].drop = "middle";
                              }
                              console.log("==========Lossing PLayer data===========")
                              console.log(this.players[playerIndex])
                              console.log("++++++++++++++++++"+playerScore+"++++++++++++++++++")
                              const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

                              if(playerScore == 0){
                                   playerScore = 2;
                              }
                              this.setPlayerResult(playerIndex, playerScore, validRules, []);
                              this.players[playerIndex].pState = PLAYER_STATE.AUTOEXIT;
                         }
                         if(this.gameMode == GAME_TYPES.POINT){
                              playerScore = 20;
                              this.players[playerIndex].drop = "middle";
                              console.log("==========Lossing PLayer data===========")
                              console.log(this.players[playerIndex])
                              const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

                              this.setPlayerResult(playerIndex, 40, rules, []);
                              this.players[playerIndex].pState = PLAYER_STATE.AUTOEXIT;
                         }
                         
                         loggerError.gameLog(this._id, "Player data after three skip ", this.players.toString())

                         //check for the other players data
                         await this.makeResultForOther(playerIndex);
                         //console.log(this.players)
                         //await this.makeResultForOther(playerIndex);
                         let responseScoreList = await this.checkWinnerOnExit(this.roomId, this.contestId, PLAYER_STATE.AUTOEXIT)

                         // var transaction = new Transaction();
                         let getlosserpoint = 0;
                         let getContestDetails = await intializeRabbitMQ.Instance.Transaction.getContestDetails(this.contestId.toString(),this.gameMode)
                         //calculate losser point
                         for (let i = 0; i < responseScoreList.length; i++) {
                              //getlosserpoint
                              if (responseScoreList[i].Score > getlosserpoint) {
                                   getlosserpoint = responseScoreList[i].Score
                              }
                              for (let j = 0; j < this.WalletTransactionArray.length; j++) {
                                   if (this.WalletTransactionArray[j].UserId == responseScoreList[i].UserId) {
                                        responseScoreList[i].WalletTransactionId = this.WalletTransactionArray[j].WalletTransactionId
                                   }
                              }
                         }
                         responseScoreList.forEach((player)=>{
                              this.players.forEach((element)=>{
                                   if(player.userId == element.userId){
                                        console.log(element.result.score)
                                        if(typeof element.EarnCoin === "undefined"){
          
                                             element.EarnCoin = element.result.score;
                                        }
                                        player.Score = element.result.score;
                                   }
                              })
                         })
                         let getHigherPoint = await this.getMaxpoint()
                         //swap earnCoin
                         for(let i=0;i<this.players.length;i++){
                              let temp = this.players[i].result.score;
                              if(getHigherPoint == temp){
                                   if(this.round!=1 ){
                                        this.players[i].EarnCoin = parseFloat(this.players[i].EarnCoin)-getHigherPoint;
                                   }
                                   else{
                                        this.players[i].EarnCoin = parseFloat(this.metaData.maxpoints)-getHigherPoint;
                                   }
                              }
                              else{
                                   if(this.round!=1 ){
                                        this.players[i].EarnCoin= parseFloat(this.players[i].EarnCoin)+getHigherPoint;
                                   }
                                   else{
                                        this.players[i].EarnCoin= parseFloat(this.metaData.maxpoints)+getHigherPoint;
                                   }
                              }
                              //break;
                         }
                         
                         //calculate winning amount
                         let getWinningAmount
                         
                         if(this.gameMode==GAME_TYPES.POINT){
                              getWinningAmount = this.calculateAmountv3(getlosserpoint, getContestDetails.pointsvalue, getContestDetails.noofplayers, getContestDetails.maxpoints, getContestDetails.commisionpercent, getContestDetails.discountpercent, getContestDetails.bonuspercent)
                              //calculateAmountv1
                              if (false) {
                                   for (let index = 0; index < responseScoreList.length; index++) {
                                        if (responseScoreList[index].IsWin) {
                                             responseScoreList[index].WinningAmount = getWinningAmount.won + getWinningAmount.joiningFee;
                                             responseScoreList[index].bonusAmount = 0;
                                             responseScoreList[index].AmountChange = getWinningAmount.won;
                                        }
                                        else {
                                             responseScoreList[index].WinningAmount = getWinningAmount.returnAmount + getWinningAmount.discoutnAmount;
                                             responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                                             responseScoreList[index].AmountChange = getWinningAmount.loss * (-1);
                                        }
                                   }
                              }
                              //calculateAmountv2
                              if (false) {
                                   for (let index = 0; index < responseScoreList.length; index++) {
                                        if (responseScoreList[index].IsWin) {
                                             responseScoreList[index].WinningAmount = getWinningAmount.won;
                                             responseScoreList[index].bonusAmount = 0;
                                             responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                                        }
                                        else {
                                             responseScoreList[index].WinningAmount = getWinningAmount.loss;
                                             responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                                             responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                                        }
                                   }
                              }
                              ////calculateAmountv3
                              for (let index = 0; index < responseScoreList.length; index++) {
                                   if (responseScoreList[index].IsWin) {
                                        responseScoreList[index].WinningAmount = getWinningAmount.won;
                                        responseScoreList[index].bonusAmount = 0;
                                        responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                                   }
                                   else {
                                        responseScoreList[index].WinningAmount = getWinningAmount.loss;
                                        responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                                        responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                                   }
                              }
                         }
                         
                         if(this.gameMode == GAME_TYPES.DEAL){
                              //make result for sending in procedure
                              responseScoreList.forEach((player)=>{
                                   this.players.forEach((earn)=>{
                                        if(player.userId == earn.userId){
                                                  player.Score = earn.EarnCoin
                                        }
                                   })
                              })
                              //create request for the getContestWinner
                              let request={
                                   rummyParticipantScore:[],
                                   ContestId:this.contestId,
                                   RoomId:this.roomId
                               }
                              request.rummyParticipantScore=responseScoreList; 
                              this.log(this._id, "Request Winner record from procedure after game exit",winnerRecord,request)
                              var winnerRecord = await intializeRabbitMQ.Instance.Transaction.getContestWinners(request,this._id)
                              this.log(this._id, "Winner record from procedure after game exit",winnerRecord)
                              //setting up the player as winner in
                              winnerRecord.forEach((player)=>{
                                   if(player.IsWin){
                                        player.pState = PLAYER_STATE.WON
                                   }
                                   else{
                                        player.pState = PLAYER_STATE.LOST
                                   }
                              })

                              getWinningAmount = 0
                              responseScoreList.forEach((responselist)=>{
                                   winnerRecord.forEach((record)=>{
                                        if(record.UserId == responselist.UserId){
                                             responselist.IsWin = record.IsWin
                                             if (record.IsWin) {
                                                  responselist.WinningAmount = record.Amount;
                                                  responselist.bonusAmount = 0;
                                                  responselist.AmountChange = record.Amount;
                                             }
                                             else{
                                                  responselist.WinningAmount = record.Amount;
                                                  responselist.bonusAmount = 0;
                                                  responselist.AmountChange = getContestDetails.ja * (-1);
                                             }
                                        }
                                   })
                              })
                             
                         }
                         let pushresult = [];
                         let resultplay = {}
                         responseScoreList.forEach(element => {
                              resultplay.UserId = element.UserId;
                              if(this.gameMode==GAME_TYPES.POINT){
                                   if(element.IsWin){
                                        resultplay.WinningAmount = getWinningAmount.won;
                                   }
                                   else{
                                        resultplay.WinningAmount = getWinningAmount.loss;
                                   }
                                   //resultplay.WinningAmount = getContestDetails.wa;
                                   resultplay.Score = element.Score;
                                   resultplay.IsWin = element.IsWin;
                                   resultplay.Rank = element.Rank;
                                   resultplay.BonusAmount = element.bonusAmount;
                                   resultplay.WalletTransactionId = element.WalletTransactionId;
                                   resultplay.PlayerState = element.PlayerState;
                                   //resultplay.gameMode = this.gameMode;
                              
                              }
                              if(this.gameMode==GAME_TYPES.DEAL){
                                   resultplay.Score = element.Score;
                              }
                              pushresult.push(resultplay)
                              resultplay = {}
                         });
                         this.log(this._id, "Game pratisipant score ",pushresult)
                              
                         let winningData={}
                         if(this.gameMode==GAME_TYPES.DEAL){
                              winningData = {
                                   RoomId: this.roomId.toString(),
                                   ContestId: this.contestId.toString(),
                                   participantScores: pushresult,
                                   ExitCount:0,
                                   AutoExitCount:1,
                                   NormalCount: 1,
                                   IsPrivate:false
                              }
                         }
                         if(this.gameMode==GAME_TYPES.POINT){
                              winningData = {
                                   RoomId: this.roomId.toString(),
                                   ContestId: this.contestId.toString(),
                                   participantScores: pushresult,
                                   //ExitCount:0,
                                   //AutoExitCount:1,
                                   //NormalCount: 1,
                                   IsPrivate:false
                              }
                         }
                         
                         this.log(this._id, "Request Winner record from winner queue after game exit",winningData)
                              
                         
                         pushresult = [];
                         //let winningData = this.getWinningUserData(request)
                         // let rabbitMQ = new RabbitMQ();
                         // await rabbitMQ.setupConnection();
                         // console.log(winningData)
                         this.log('Winning queue data=>', winningData)
                         let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToWinningQueue(winningData,this.gameMode)
                         
                         responseScoreList.forEach((player)=>{
                              this.players.forEach((element)=>{
                                   if(player.userId == element.userId){
                                        player.Score = element.result.score
                                   }
                              })
                         })
                         const response = {
                              _id: this.tableId,
                              playedBy: this.players[playerIndex].userId,
                              gameState: this.gameState,
                              eventCode: "exitGame",
                              turnState: this.turnState,
                              players: this.players,
                              result: responseScoreList,
                              metaData:this.metaData,
                              isResult:this.isResult
                         }
                         this.result = responseScoreList;
                         console.log(this.result)
                         activeGame.dec();
                         this.log(this._id, "Response genratednaftrnn player data ", this.players)
                         //console.log("AUTO EXIT timer response \n ", response);
                         // distroyTable(this._id)
                         this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response);
                         this.destroyTable()
                         this.stopTimer();

                         return;
                    }

                    if (this.xFac && this.currentTurnIndex == 1) {
                         setTimeout(() => this.xFac.playTurn(), 0)
                    }

                    this.log('Player skip count is ', this.players[playerIndex].skipped);
                    const response = {
                         playedBy: this.players[playerIndex].userId,
                         _id: this.tableId,
                         eventCode: "skipTurn",
                         changeTurn: true,
                         totalTurnTime: this.totalTurnTime,
                         deck: this.deck.length,
                         draw: this.draw,
                         currentTurnIndex: this.currentTurnIndex,
                         // card: card,
                         turnState: this.turnState,
                         gameState: this.gameState,
                         skip: {
                              playerIndex: playerIndex,
                              skipCount: this.players[playerIndex].skipped
                         },
                         turnCount: this.turnCount
                    };
                    this.sendLogInMongo("skipTurn", response)
                    //console.log("Start timer response \n ", response);
                    this.log('Send turn change resp on turn timeout ', response);
                    this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response);
                    await this.startTimer(2);
               } catch (err) {
                    console.error('Error in turnTimeout=>', err)
                    this.log('Error in turnTimeout=>', err.toString());
                    // throw err;
               }
          }, this.totalTurnTime);
     }

     async startDeclareTimer() {
          this.autodeclareTimer=setTimeout(async () => {
               this.log('Declare timeout called')
               for (let pIndex = 0; pIndex < this.players.length; pIndex++) {
                    let player = this.players[pIndex];
                    if (!player.result) {
                         this.isResult=true;
                         this.log(player.name, ' found that this player not declared yet so auto declaring')
                         let resp = await this.onDeclareResultV2(player.userId, JSON.stringify(player.melds), 'AUTO-DECLARE')
                         this.log('Declare response on auto-declare', resp);
                         this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, resp);
                    }
               }
          }, DECLARE_TIME + 3000)
     }
     stopTimer() {
          this.log('StopTimer called ')
          if (this.timer) {
               this.log('Timer found clearing it');
               clearTimeout(this.timer);
               //clearTimeout(this.bottimer)
               //clearTimeout(this.botDicardTimer)
          }
     }
     pauseTimer() {

     }
     async startGame() {
          this.log('Start GAME called in rumy class')
          this.lastTurnTime = Date.now();
          loggerError.gameLog(this._id, "Start last turn time ===", this.lastTurnTime)
          this.turnState = "start" // cardPickedUp, cardPlayed/sync cards, finish then declare, discardCard(change turn), end
          this.gameState = GAME_STATES.RUNNING;
          //here we need to check the player is bot or not by this.room type
          if (this.xFac && this.currentTurnIndex == 1) {
               setTimeout(() => this.xFac.playTurn(), 1000);

          }
          await this.startTimer();
     }
     onTurnTimerEnd() {

     }
     initDeck() {
          const deck1 = this.generateDeckCards(1);
          this.shuffleCards(deck1);
          const deck2 = this.generateDeckCards(2);
          this.shuffleCards(deck2);
          const cards = [...deck1, ...deck2];
          this.shuffleCards(cards);
          this.deck = cards;
          this.deckForToss = deck1;
          this.log("Card deck intialise")
     }
     initPlayerCards() {
          //gain calling the this.initDeck() why ?
          this.log('Init player cards')
          this.initDeck();
          this.wildCard = this.deck.splice(0, 1)[0];
          //we are making wild card in each deck
          this.deck.forEach(item => {
               //console.log("\n Wildcard Item values", item.value, this.wildCard.value);
               if (item.value == this.wildCard.value) {
                    item.isWildCard = true;
               } else {
                    item.isWildCard = false;
               }
          })
          for (let i = this.players.length - 1; i >= 0; i--) {
               let player = this.players[i];
               if (this.xFac && i == 1) {
                    player.index = i;
                    player.pState = PLAYER_STATE.PLAYING;
                    player.cards = this.xFac.initCardsV2(this, i, this.deck, this.wildCard);
                    player.melds = [];
                    player.skipped = 0;
                    player.turnNo = 0;
                    //player.EarnCoin = parseInt(this.metaData.maxpoints)
                    
               } else {
                    player.index = i;
                    player.pState = PLAYER_STATE.PLAYING;
                    player.cards = this.deck.splice(0, 13);
                    player.melds = [];
                    player.skipped = 0;
                    player.turnNo = 0;
                    //player.EarnCoin = parseInt(this.metaData.maxpoints)
                    
               }
               //playerData.push(player)

          }
          
          // this.players.forEach((player,index) => {
          //      if (this.xFac && index == 1) {
          //           //player.index = player.index;
          //           player.pState = PLAYER_STATE.PLAYING;
          //           player.cards = this.xFac.initCardsV2(this, i, this.deck);
          //           player.melds = [];
          //           player.skipped = 0;
          //           player.turnNo = 0;
          //      } else {
          //           player.pState = PLAYER_STATE.PLAYING;
          //           player.cards = this.deck.splice(0, 13);
          //           player.melds = [];
          //           player.skipped = 0;
          //           player.turnNo = 0;
          //      }
          // });
          this.draw = this.deck.splice(0, 1);

          // if (this.xFac) {
          //      this.xFac.initCards(this.players[1].cards, this, ,);
          // }
     }
     discardPlayerArray() {
          const resp = this.players.map(player => {
               return {
                    userId: player.userId,
                    skipped: player.skipped,
                    index: player.index,
                    turnNo: player.turnNo
               }
          });
          return resp;
     }
     generateDeckCards(deckId) {
          let cards = [];
          for (let suit of ['spade', 'heart', 'diamond', 'club']) {
               for (let i = 2; i <= 10; i++) {
                    // const id = new mongoose.Types.ObjectId().toString();
                    const id = `${deckId}-${suit}-${i}`
                    const card = {
                         id: id,
                         suit: suit,
                         rank: "" + i,
                         value: this.cardRanks.indexOf("" + i),
                         deckId: deckId,
                         isWildCard: false
                    }
                    cards.push(card);
                    this.cardsMap.set(id, card);
               }

               for (let face of ['A', 'J', 'Q', 'K']) {
                    // const id = new mongoose.Types.ObjectId().toString();
                    const id = `${deckId}-${suit}-${face}`
                    const card = {
                         id: id,
                         suit: suit,
                         rank: face,
                         value: this.cardRanks.indexOf(face),
                         deckId: deckId,
                         isWildCard: false
                    }
                    cards.push(card);
                    this.cardsMap.set(id, card);
               }

          }
          return cards;
     }
     shuffleCards(cards) {
          for (let i = cards.length - 1; i > 0; i--) { // Shuffle Cards
               const j = Math.floor(Math.random() * (i + 1));
               [cards[i], cards[j]] = [cards[j], cards[i]];
          }
     }
     printCardDetails(id) {
          //console.log("\n Card details id ",id);
          //console.log("\n Card details info ",JSON.stringify(this.cardsMap.get(id)));
     }
     showOutPut() {
          //console.log("\n deck ", this.deck);
          //console.log("\n draw ", this.draw);
          //console.log("\n current player state ", this.players[this.currentTurnIndex]);
          //console.log("\n current turn index ", this.currentTurnIndex);
     }
     popFromDeck() {
          if (this.deck.length) {
               return this.deck.pop();
          }
          // shuffle draw cards again
          return;
     }
     popNonJokerFromDeck(i=1){
          this.log('popNonJokerFromDeck called', i, this.deck.length)
          if(this.deck.length<=0 || i>=this.deck.length){
               this.log('Recurssion break')
               return
          }
          let card = this.deck[this.deck.length-i]
          if(card.isWildCard){
               card = this.popNonJokerFromDeck(i+1)
          }
          if(card){
               this.log('Non joker card found', card)
               this.deck.splice(this.deck.length - i, 1);
          }
          return card
          
     }
     popFromDraw() {
          if (this.draw.length) {
               return this.draw.shift();
          }
          // shuffle draw cards again
          return;
     }
     addCardToPlayerHand(playerIndex, card) {
          // check length of hand 
          // add to player hand and update the state. // update deck and player
          if ((this.players[playerIndex].cards.length) == 13) {
               let playerMelds = this.players[playerIndex].melds
               this.players[playerIndex].cards.push(card);
               this.players[playerIndex].melds[playerMelds.length - 1].cards.push(card.id)
          }
          else {
               throw customError.createCustomError(400, "Player cards+melds > 13=" + this._id);
          }
     }
     validateTurnState(playerIndex, action) {
          if (playerIndex != this.currentTurnIndex) {
               const message = playerIndex + "Not your turn, currentTurnIndex = " + this.currentTurnIndex;
               throw customError.createCustomError(400, message);
          }
          this.validateState(playerIndex, action);
     }
     validateState(playerIndex, action) {
          if (this.turnState == "start" && action == "draw") {
               return true;
          }
          else if (this.turnState == "cardPickedUp" && action == "discard") {
               return true;
          }
          else if (this.turnState == "cardPickedUp" && action == "finish") {
               return true;
          }
          else if (this.turnState == "finish" && action == "declare") {
               return true;
          }
          else if (this.turnState == "declare" && action == "declare") {
               return true;
          }
          else if (this.turnState == "end" && action == "declare") {
               return true;
          }
          else {
               //this.stopTimer();
               throw customError.createCustomError(400, "Your Turn State is " + this.turnState + " action not allowed " + action);
          }
     }

     onDrawFromOpen(userId) {
          const playerIndex = this.playerIndex(userId);
          this.log('Player card & meld before draw=>', this.players[playerIndex].cards, 'MELDS=>', this.players[playerIndex].melds)
          // const playerIndex = this.currentTurnIndex || 0;
          this.validateTurnState(playerIndex, "draw");
          const card = this.popFromDraw();
          this.drawnCard = card;
          this.recentPickedCard[playerIndex] = this.drawnCard;
          this.addCardToPlayerHand(playerIndex, card);
          this.log('Player draw card from open ', this.players[playerIndex].name, card)

          this.log('Player card & meld after draw=>', this.players[playerIndex].cards, 'MELDS=>', this.players[playerIndex].melds)

          this.turnState = "cardPickedUp";
          const response = {
               playedBy: userId,
               _id: this.tableId,
               eventCode: "draw",
               from: "open",
               currentTurnIndex: playerIndex,
               card: card,
               turnState: this.turnState,
               gameState: this.gameState,

          }
          //////this.players[playerIndex].skipped = 0;
          this.sendLogInMongo("draw", response)
          return response;
     }
     onDrawFromClosed(userId, nonJoker=false) {
          try {
               const playerIndex = this.playerIndex(userId);
               this.log('Player card & meld before drawo=>', this.players[playerIndex].cards, 'MELDS=>', this.players[playerIndex].melds)
               this.validateTurnState(playerIndex, "draw");
               let card;
               if(nonJoker){
                    card = this.popNonJokerFromDeck();
               } else{
                    card = this.popFromDeck(nonJoker);   
               } 
               this.drawnCard = card;
               this.recentPickedCard[playerIndex] = this.drawnCard;
               this.addCardToPlayerHand(playerIndex, card);
               // if (userId == 'bot-player-01') {
               //      //sync data again for crearing meld for bot
               //      let meldallcards = this.botAddCardtoMeld(this.players[this.currentTurnIndex].melds, this.drawnCard);
               //      this.players[playerIndex].melds = meldallcards;

               // }
               this.log('Player card & meld after draw=>', this.players[playerIndex].cards, 'MELDS=>', this.players[playerIndex].melds)
               this.log('Player draw card from closed deck ', this.players[playerIndex].name, card)
               this.turnState = "cardPickedUp";
               const response = {
                    playedBy: userId,
                    _id: this.tableId,
                    eventCode: "draw",
                    from: "closed",
                    currentTurnIndex: playerIndex,
                    card: card,
                    turnState: this.turnState,
                    gameState: this.gameState,

               }
               //////this.players[playerIndex].skipped = 0;
               this.sendLogInMongo("draw", response)
               return response;
          } catch (err) {
               console.error(err)
               this.log('Error on onDrawFromClosed', userId, err)
               throw err;
          }
          // const playerIndex = this.currentTurnIndex || 0;

     }
     removeCardFromPlayerHand(playerIndex, cardId) {
          let card;
          const newHand = this.players[playerIndex].cards.filter(cardInHand => {
               if (cardInHand.id != cardId) return true;
               else {
                    card = cardInHand;
                    return false;
               }
          });
          if (!card) {
               throw customError.createCustomError(400, "card Id : " + cardId + "Not found for playerIndex : " + this.currentTurnIndex);
          }
          this.players[playerIndex].cards = [...newHand];
          return card;
     }
     removeCardFromPlayerMelds(playerIndex, cardId) {
          this.log('Removing card from player meld', cardId, playerIndex);
          let meldposition;
          let newMeld
          this.players[playerIndex].melds.forEach(meld => {
               meld.cards.forEach(cardInMeld => {
                    if (cardInMeld == cardId) {
                         meldposition = meld.meldLocation
                         newMeld = meld.cards.filter(item => item !== cardId)
                    }
               })
          })
          this.log('meld position on removecardfrommeld', meldposition)
          //delete from the melds.cards of player
          //console.log(newMeld)
          if (meldposition != undefined) {
               this.players[playerIndex].melds.forEach(meld => {
                    if (meld.meldLocation == meldposition) {
                         this.log('Setting new cards in melds=>', newMeld)
                         meld.cards = newMeld
                    }
               })
          }

          //console.log(this.players[playerIndex].melds[meldposition])
          return;
     }
     async onDiscardCard(userId, cardId) {
          try {
               this.log('Request come to discard card ', userId, cardId);
               this.turnCount += 1;
               const playerIndex = this.playerIndex(userId);
               this.log('Player cards before discard=> ', this.players[playerIndex].cards, 'Melds=>', this.players[playerIndex].melds);
               // const playerIndex = this.currentTurnIndex || 0;
               this.validateTurnState(playerIndex, "discard");
               // this.stopTimer();
               if (this.deck.length < 1) {
                    //fire finised event
                    await this.delay(2000);
                    let resp = await this.onFinishGame(userId, cardId, "Declare due to Cards is finised ")
                    console.log("Game exit on deck finised \n ", resp.eventCode);
                    console.log("Game exit on declaration time to  finised \n ", resp.DECLARE_TIME);
                    this.log("Game exit on deck finised \n ==================")
                    this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, resp);
                    console.log("=================" + this.deck.length + " the length fire finise event")
                    return resp;
               }
               else {
                    const card = this.removeCardFromPlayerHand(playerIndex, cardId);
                    this.removeCardFromPlayerMelds(playerIndex, cardId)
                    //remove card for meld for bot
                    // if(userId == 'bot-player-01'){
                    //      //remove card from meld
                    //      let newCards;
                    //      let flagFound=false;
                    //      let getmeld = this.players[this.currentTurnIndex].melds;
                    //      for (let index = 0; index < getmeld.length; index++) {
                    //           //take a chance
                    //           for (let cardIndex = 0; cardIndex < getmeld[index].cards.length; cardIndex++) {
                    //                if(getmeld[index].cards[cardIndex] == cardId){
                    //                     newCards = getmeld[index].cards.splice(cardIndex, 1);
                    //                     this.players[this.currentTurnIndex].melds[index].cards = getmeld[index].cards;
                    //                     flagFound =true;
                    //                     break;
                    //                }
                    //           }
                    //           if(flagFound){
                    //                break;
                    //           }
                    //      }
                    // } 
                    if (card) {
                         this.draw.unshift(card);
                    }
                    this.stopTimer();
                    let numberofplayer = this.players.length;
                    this.currentTurnIndex = (this.currentTurnIndex + 1) % (numberofplayer);
                    this.turnState = "start";
                    this.lastTurnTime = Date.now();
                    this.drawnCard = null;
                    if (this.xFac && this.currentTurnIndex == 1) {
                         setTimeout(() => this.xFac.playTurn(), 0);
                    }
                    //////this.players[playerIndex].skipped = 0;
                    this.players[playerIndex].turnNo += 1;
                    const response = {
                         playedBy: userId,
                         _id: this.tableId,
                         eventCode: "discard",
                         changeTurn: true,
                         totalTurnTime: this.totalTurnTime,
                         // cards: this.players[playerIndex].cards,
                         // melds: this.players[playerIndex].melds,
                         deck: this.deck.length,
                         draw: this.draw,
                         currentTurnIndex: this.currentTurnIndex,
                         card: card,
                         turnState: this.turnState,
                         gameState: this.gameState,
                         players: this.discardPlayerArray(),
                         turnCount: this.turnCount,
                    };
                    this.log('Discard card response ', response)
                    this.log('Player cards after discard=> ', this.players[playerIndex].cards, 'Melds=>', this.players[playerIndex].melds);

                    //clearTimeout(this.bottimer);
                    // if(userId != 'bot-player-01'){
                    this.sendLogInMongo("discard", response)
                    // this.log('Call change turn on discard card')
                    await this.startTimer(2);
                    // }
                    return response;
               }
          } catch (err) {
               this.log('Error on discard card', err.toString());
               throw err
               // this.turnChange();
          }

     }

     turnChange() {
          let numberofplayer = this.players.length;
          this.currentTurnIndex = (this.currentTurnIndex + 1) % (numberofplayer);
          this.turnState = "start";
          this.lastTurnTime = Date.now();
          this.drawnCard = null;
          this.startTimer(2);
     }

     async onFinishGame(userId, cardId, reasonMessage = "") {

          this.printCardDetails(cardId);
          const playerIndex = this.playerIndex(userId);
          this.log('Finish game request from ', this.players[playerIndex].name, cardId, playerIndex);
          this.stopTimer();
          // const playerIndex = this.currentTurnIndex || 0;
          this.validateTurnState(playerIndex, "finish");

          cardId = cardId || this.drawnCard?.id || null;
          if (cardId) {
               const card = this.removeCardFromPlayerHand(playerIndex, cardId);
               this.removeCardFromPlayerMelds(playerIndex, cardId)
               if (card) {
                    this.draw.unshift(card);
               }
          }
          this.turnState = "finish";
          this.finishedOn = Date.now();
          this.drawnCard = null;
          this.finishedByIndex = playerIndex;
          this.firstdeclared = userId
          // this.stopTimer();

          const response = {
               playedBy: userId,
               _id: this.tableId,
               eventCode: "finish",
               cards: this.players[playerIndex].cards,
               // deck: this.deck.length,
               players: this.players,
               draw: this.draw,
               turnTime: DECLARE_TIME,
               currentTurnIndex: this.currentTurnIndex,
               turnState: this.turnState,
               gameState: this.gameState,
               reasonMessage: reasonMessage,
               firstdeclared: this.firstdeclared,
               finishedByIndex: this.finishedByIndex,
               declareTurnTime: DECLARE_TIME

          };
          this.log('Sending finish game response ', response);
          this.sendLogInMongo("finish", response)
          await this.startDeclareTimer();
          if (this.xFac) {
               this.xFac.onOpponentDeclare(userId);
          }
          return response;

     }
     parseMelds(melds) {
          try {
               // console.log("\n Melds : before ", melds);
               melds = JSON.parse(melds);
               // console.log("\n Melds : after ", melds);
               return melds;
          }
          catch (e) {
               throw customError.createCustomError(400, "Can't parse melds, check parameter again");
          }
     }
     cardsInfo(playerIndex, cards) {
          let hand = [];
          cards.forEach(cardId => {
               const data = this.findPlayerCardById(playerIndex, cardId);
               hand.push(data);
          });
          return hand;
     }
     allDeclaredResult() {
          for (let i = 0; i < this.players.length; i++) {
               //console.log("player result object ", i, " result ", this.players[i].result);
               if (!this.players[i].result) { return false };
          }
          return true;
     }
     
     isWinner(rules) {
          if (rules.invalid >= 1) {
               return false;
          }
          else if (rules.pureSeq >= 1 && rules.impureSeq >= 1) {
               return true
          }
          else if (rules.pureSeq >= 2 && rules.invalid == 0) {
               return true;
          }
          else {
               return false;
          }
     }
     checkWinnerOnGameEnd() {
          let responseScore;
          let responseScoreList = [];
          //game logies written here
          const result = this.players[this.finishedByIndex].result;
          if (!this.isWinner(result.rules)) {
               responseScore = {}
               console.log("\n \n checkWinnerOnGameEnd case -1 for invalid declaration");
               responseScore.UserId = this.players[this.finishedByIndex].MID;
               responseScore.userId = this.players[this.finishedByIndex].userId;
               responseScore.Score = 80;
               responseScore.IsWin = false;
               responseScore.Rank = 2;
               responseScore.PlayerState = PLAYER_STATE.LOST;
               responseScoreList.push(responseScore);

               this.players[this.finishedByIndex].pState = PLAYER_STATE.LOST;
               this.players[this.finishedByIndex].result.score = 80;
               for (let i = 0; i < this.players.length; i++) {
                    responseScore = {}
                    if (i == this.finishedByIndex) continue;
                    this.players[i].pState = PLAYER_STATE.WON;
                    this.players[i].result.score = 0;
                    responseScore.UserId = this.players[i].MID;
                    responseScore.userId = this.players[i].userId;
                    responseScore.Score = 0;
                    responseScore.IsWin = true;
                    responseScore.Rank = 1;
                    responseScore.PlayerState = PLAYER_STATE.WON;
                    responseScoreList.push(responseScore);
               }
          }
          else {
               const validPlayers = this.players.filter(player => {
                    return this.isWinner(player.result.rules);
               });
               if (validPlayers.length > 0) {
                    validPlayers.sort(player => -player.result.score);
                    if (validPlayers.length === 2) { // case when both scores = 0
                         console.log("\n \n checkWinnerOnGameEnd case - 2  when both have valide declaration");
                         const winnerIndex = this.finishedByIndex;
                         this.players[winnerIndex].pState = PLAYER_STATE.WON;
                         responseScore = {}
                         responseScore.UserId = this.players[winnerIndex].MID;
                         responseScore.userId = this.players[winnerIndex].userId;
                         responseScore.Score = this.players[winnerIndex].result.score;
                         responseScore.IsWin = true;
                         responseScore.Rank = 1;
                         responseScore.PlayerState = PLAYER_STATE.WON;
                         responseScoreList.push(responseScore);
                         for (let i = 0; i < this.players.length; i++) {
                              responseScore = {}
                              if (i == winnerIndex) continue;
                              this.players[i].pState = PLAYER_STATE.LOST;
                              responseScore.UserId = this.players[i].MID;
                              responseScore.userId = this.players[i].userId;
                              //responseScore.Score = this.players[i].result.score;
                              responseScore.Score = 2;
                              responseScore.IsWin = false;
                              responseScore.Rank = 2;
                              responseScore.PlayerState = PLAYER_STATE.LOST;
                              responseScoreList.push(responseScore);
                         }
                    }
                    else {
                         console.log("\n \n checkWinnerOnGameEnd case - 3 when only 1 valid player declartion");
                         const winnerIndex = validPlayers[0].index;
                         this.players[winnerIndex].pState = PLAYER_STATE.WON;
                         responseScore = {}
                         responseScore.UserId = this.players[winnerIndex].MID;
                         responseScore.userId = this.players[winnerIndex].userId;
                         responseScore.Score = this.players[winnerIndex].result.score;
                         responseScore.IsWin = true;
                         responseScore.Rank = 1;
                         responseScore.PlayerState = PLAYER_STATE.WON;
                         responseScoreList.push(responseScore);
                         for (let i = 0; i < this.players.length; i++) {
                              responseScore = {}
                              if (i == winnerIndex) continue;
                              this.players[i].pState = PLAYER_STATE.LOST;
                              responseScore.UserId = this.players[i].MID;
                              responseScore.userId = this.players[i].userId;
                              // If somehow invalid player get score=0 then set his score = 2
                              if(this.players[i].turnNo>0){
                                        responseScore.Score = this.players[i].result.score || 2;
                                   }
                                   else{
                                        responseScore.Score = this.players[i].result.score/2;
                              } 
                              responseScore.IsWin = false;
                              responseScore.Rank = 2;
                              responseScore.PlayerState = PLAYER_STATE.LOST;
                              responseScoreList.push(responseScore);
                         }
                    }
               }

          }
          return responseScoreList;
     }
    
     setPlayerResult(playerIndex, score, rules, melds, declared = true) {
          score = (score >= 80) ? 80 : score;
          // if (this.players.find(o => o.userId === 'bot-player-01') != undefined) {
          //      if (playerIndex == 1) {
          //           let theCards;
          //           melds.forEach(element => {
          //                theCards = element.cards;
          //                theCards = this.cardsInfo(1, theCards)
          //                element.cards = theCards;
          //           });
          //      }
          // }

          this.players[playerIndex].result = {
               score: score,
               rules: rules,
               melds: melds,
               declared: declared
          }
          this.log("Player Meld on setPlayerResult=>",)
     }
     checkMeldisOnlyWild(meld, playerIndex) {
          this.log('Checking Melds for wild', meld, playerIndex)
          let countisWild = 0;
          let isWild = false;
          meld.cards.forEach(card => {
               // this.log('Loop in in')
               // let getCardDetail = this.findPlayerCardById(playerIndex, card);
               // this.log('Card details on check meld is wild ', getCardDetail)
               if (card.isWildCard) {
                    countisWild++;
               }
          })
          this.log('Checking meld contains only wild or not', meld, meld.cards.length, countisWild)
          if (meld.cards.length == countisWild) {
               isWild = true;
          }
          return isWild
     }
     isDeclarationValid(melds) {
          let pureSeq = 0;
          let seq = 0;
          let isValid = false;
          melds.forEach((meld) => {
               if (meld.meldType == "Pure Sequence") pureSeq++;
               else if (meld.meldType == "Sequence") seq++;
          })
          if (pureSeq >= 2) isValid = true
          else if (pureSeq >= 1 && seq >= 1) isValid = true
          else isValid = false

          return isValid;
     }
     async onDeclareResult(userId, playerMelds, mode) {
          // const playerIndex = this.currentTurnIndex||0;

          const playerIndex = this.playerIndex(userId);

          this.validateState(playerIndex, "declare")
          let melds
          // if (userId == 'bot-player-01') {
          //      melds = playerMelds;
          // }
          // else {
          melds = this.parseMelds(playerMelds)
          //}
          this.log('Declare result rquest from ', this.players[playerIndex].name, melds, 'Payload=>', playerMelds);
          const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

          //the meld have already the Pure Sequence or not check before score calculation
          let CountPureSequence = melds.filter((meld) => { if (meld.meldType == "Pure Sequence") { return meld; } })
          let CountSequence = melds.filter((meld) => { if (meld.meldType == "Sequence") { return meld; } })
          let playerScore = 0;
          melds.forEach(meld => {
               let cards = this.cardsInfo(playerIndex, meld.cards);
               meld.cards = cards;
               // If 
               if (meld.meldType == "Pure Sequence") {
                    this.log('Meld is PureSeq ', meld)
                    validRules.pureSeq++;
                    meld.isValid = true;
                    meld.score = 0;
                    meld.type = "pureSeq";

               }
               else if (meld.meldType == "Sequence") {
                    this.log('Meld is Seq ', meld)
                    if (CountPureSequence.length != 0) {
                         validRules.impureSeq++;
                         meld.isValid = true;
                         meld.score = 0;
                         meld.type = "impureSeq";
                    }
                    else {
                         validRules.invalid++;
                         meld.score = this.calculateCardScore(cards);
                         playerScore = playerScore + meld.score;
                    }

               }
               else if (meld.meldType == "Set") {
                    this.log('Meld is Set ', meld)
                    if (CountPureSequence.length >= 2) {
                         validRules.set++;
                         meld.isValid = true;
                         meld.score = 0;
                         meld.type = "set";
                    }
                    else if (CountPureSequence.length != 0 && CountSequence.length != 0) {
                         validRules.set++;
                         meld.isValid = true;
                         meld.score = 0;
                         meld.type = "set";
                    }
                    else {
                         validRules.invalid++;
                         meld.score = this.calculateCardScore(cards);
                         playerScore = playerScore + meld.score;
                    }

               }
               else {

                    let getmeldStatus = this.checkMeldisOnlyWild(meld, playerIndex)
                    this.log('Meld is invalid ', getmeldStatus, true, false);
                    if (getmeldStatus == true) {
                         meld.isValid = true;
                         meld.score = 0;
                         meld.type = "invalid";
                    }
                    else {
                         validRules.invalid++;
                         meld.score = this.calculateCardScore(cards);
                         playerScore = playerScore + meld.score;
                    }
               }
          });
          loggerError.gameLog(this._id, "CountPureSequence for " + userId + ' score -' + playerScore + '-rules-set' + validRules.set + '-rules-sequence' + validRules.impureSeq + '-rules-pure-sequence' + validRules.pureSeq, CountPureSequence);
          this.log(`${this.players[playerIndex].name}=> `, `CountPureSeq ${CountPureSequence.length}, NormalSeq=>${CountSequence.length}, Score=>${playerScore}`,
               `validRules => `, validRules);
          // console.log("\n melds : ",melds);
          this.turnState = "declare";
          this.setPlayerResult(playerIndex, playerScore, validRules, melds);
          this.declaredArr.push(playerIndex);
          if (this.declaredArr.length < 2) {
               this.firstdeclared = userId;
          }
          let responseScoreList = this.checkWinnerOnGameEnd();

          this.log(`on declare of ${this.players[playerIndex].name} responseScoreList is `, responseScoreList);

          //var transaction = new Transaction();
          let getlosserpoint = 0;
          let getContestDetails = await intializeRabbitMQ.Instance.Transaction.getContestDetails(this.contestId.toString(),this.gameMode)

          //calculate losser point
          for (let i = 0; i < responseScoreList.length; i++) {
               //getlosserpoint
               if (responseScoreList[i].Score > getlosserpoint) {
                    getlosserpoint = responseScoreList[i].Score
               }
               for (let j = 0; j < this.WalletTransactionArray.length; j++) {
                    if (this.WalletTransactionArray[j].UserId == responseScoreList[i].UserId) {
                         responseScoreList[i].WalletTransactionId = this.WalletTransactionArray[j].WalletTransactionId
                    }
               }
          }




          if (this.allDeclaredResult()) {

               //calculate winning amount
               let getWinningAmount = this.calculateAmountv3(getlosserpoint, getContestDetails.pointsvalue, getContestDetails.noofplayers, getContestDetails.maxpoints, getContestDetails.commisionpercent, getContestDetails.discountpercent, getContestDetails.bonuspercent)
               this.log('All user declard', getWinningAmount)
               //put amount to request for push to winning queue
               //calculateAmountv1
               if (false) {
                    for (let index = 0; index < responseScoreList.length; index++) {
                         if (responseScoreList[index].IsWin) {
                              responseScoreList[index].WinningAmount = getWinningAmount.won + getWinningAmount.joiningFee;
                              responseScoreList[index].bonusAmount = 0;
                              responseScoreList[index].AmountChange = getWinningAmount.won;
                         }
                         else {
                              responseScoreList[index].WinningAmount = getWinningAmount.returnAmount + getWinningAmount.discoutnAmount;
                              responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                              responseScoreList[index].AmountChange = getWinningAmount.loss * (-1);
                         }
                    }
               }
               //calculateAmountv2
               if (false) {
                    for (let index = 0; index < responseScoreList.length; index++) {
                         if (responseScoreList[index].IsWin) {
                              responseScoreList[index].WinningAmount = getWinningAmount.won;
                              responseScoreList[index].bonusAmount = 0;
                              responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                         }
                         else {
                              responseScoreList[index].WinningAmount = getWinningAmount.loss;
                              responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                              responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                         }
                    }
               }
               //calculateAmountv3
               for (let index = 0; index < responseScoreList.length; index++) {
                    if (responseScoreList[index].IsWin) {
                         responseScoreList[index].WinningAmount = getWinningAmount.won;
                         responseScoreList[index].bonusAmount = 0;
                         responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                    }
                    else {
                         responseScoreList[index].WinningAmount = getWinningAmount.loss;
                         responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                         responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                    }
               }




               // let amount = parseFloat(getWinningAmount.returnAmount)+ parseFloat(getWinningAmount.returnAfterDiscount);
               // responseScoreList[i].WinningAmount= ((amount > 0 ) ? amount : 0 );

               //check for the result

               console.log("Game Ends Now");
               this.turnState = "end";
               this.gameState = GAME_STATES.FINISHED;

               let pushresult = [];
               let resultplay = {}
               responseScoreList.forEach(element => {
                    resultplay.UserId = element.UserId;
                    resultplay.Score = element.Score;
                    resultplay.IsWin = element.IsWin;
                    resultplay.Rank = element.Rank;
                    resultplay.WinningAmount = element.WinningAmount.toFixed(2);
                    resultplay.BonusAmount = element.bonusAmount;
                    resultplay.WalletTransactionId = element.WalletTransactionId;
                    resultplay.PlayerState = element.PlayerState;
                    resultplay.gameMode = this.gameMode;
                    pushresult.push(resultplay)
                    resultplay = {};
               });
               let winningData = {
                    RoomId: this.roomId.toString(),
                    ContestId: this.contestId.toString(),
                    participantScores: pushresult,
                    ExitCount:0,
                    AutoExitCount:1,
                    NormalCount: 1,
                    IsPrivate:false

               }

               //let winningData = this.getWinningUserData(request)
               // let rabbitMQ = new RabbitMQ();
               // await rabbitMQ.setupConnection();
               console.log(responseScoreList)
               let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToWinningQueue(winningData,this.gameMode)
               this.stopTimer();
               //this.log('Winning data ack of rabit mq', ack, winningData)
               //1this.sendGameEndResp();
               //return prize;
               //distroyTable(this._id);
          }
          let resultDashboardPlay = {}
          let resultDashboard = [];
          responseScoreList.forEach(element => {
               resultDashboardPlay.UserId = element.UserId;
               resultDashboardPlay.userId = element.userId;
               resultDashboardPlay.Score = element.Score;
               resultDashboardPlay.IsWin = element.IsWin;
               resultDashboardPlay.Rank = element.Rank;
               resultDashboardPlay.AmountChange = element.AmountChange;
               resultDashboard.push(resultDashboardPlay)
               resultDashboardPlay = {};
          });
          const response = {
               playedBy: userId,
               _id: this.tableId,
               gameState: this.gameState,
               eventCode: "declare",
               firstdeclare: this.firstdeclared,
               playerIndex: playerIndex,
               cards: this.players[playerIndex].cards,
               // deck: this.deck.length,
               draw: this.draw,
               currentTurnIndex: this.currentTurnIndex,
               turnState: this.turnState,
               players: this.players,
               result: resultDashboard,
          };
          this.log(`response on declareV2 event of ${this.players[playerIndex].name}`, response);
          this.result = resultDashboard;
          console.log(this.result)
          //distroyTable(this._id)
          this.sendLogInMongo("declare", response)
          return response;
     }

     async onDeclareResultV2(userId, playerMelds, comeFrom = 'USER_SIDE') {
          let responseScoreList = [];
          let playerScore;
          const playerIndex = this.playerIndex(userId);
          if (this.players[playerIndex].result) {
               this.log('Player already declared ', this.players[playerIndex].name)
               playerScore = this.players[playerIndex].result.score;
          } else {
               this.validateState(playerIndex, "declare")
               let melds
               // if (userId == 'bot-player-01') {
               //      melds = playerMelds;
               // }
               // else {
               melds = this.parseMelds(playerMelds)
               //}

               this.log('Declare result rquest from ', comeFrom, this.players[playerIndex].name, melds);
               const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

               const isValidDeclaration = this.isDeclarationValid(melds)
               playerScore = 0;
               melds.forEach(meld => {
                    let cards = this.cardsInfo(playerIndex, meld.cards);
                    meld.cards = cards;
                    if (!meld.cards || meld.cards?.length <= 0) {
                         this.log('Player null meld found so skipping');
                         return
                    }
                    if (meld.meldType == "Pure Sequence") {
                         this.log('Meld is PureSeq ', meld)
                         validRules.pureSeq++;
                         meld.isValid = true;
                         meld.score = 0;
                         meld.type = "pureSeq";

                    }
                    else if (meld.meldType == "Sequence") {
                         this.log('Meld is Seq ', meld)
                         if (isValidDeclaration) {
                              validRules.impureSeq++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "impureSeq";
                         }
                         else {
                              validRules.invalid++;
                              meld.score = this.calculateCardScore(cards);
                              playerScore = playerScore + meld.score;
                         }

                    }
                    else if (meld.meldType == "Set") {
                         this.log('Meld is Set ', meld)
                         if (isValidDeclaration) {
                              validRules.set++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "set";
                         }
                         else {
                              validRules.invalid++;
                              meld.score = this.calculateCardScore(cards);
                              playerScore = playerScore + meld.score;
                         }

                    }
                    else {
                         // this.log('Meld is invalid ', getmeldStatus, true, false);
                         meld.score = this.calculateCardScore(cards);
                         if (meld.score != 0) {
                              validRules.invalid++;
                         }
                         playerScore = playerScore + meld.score;
                    }
               });
               this.log(`${this.players[playerIndex].name}=> `, `isValid ${isValidDeclaration}, Score=>${playerScore}`,
                    `validRules => `, validRules);
               this.turnState = "declare";
               this.setPlayerResult(playerIndex, playerScore, validRules, melds);
               this.declaredArr.push(playerIndex);
               if (this.declaredArr.length < 2) {
                    this.firstdeclared = userId;
               }
                
          }

          if (this.allDeclaredResult()) {
               activeGame.dec();
               responseScoreList = this.checkWinnerOnGameEnd();
               //var transaction = new Transaction();
               let getlosserpoint = 0;
               let getContestDetails = await intializeRabbitMQ.Instance.Transaction.getContestDetails(this.contestId.toString(),this.gameMode)

               //calculate losser point
               for (let i = 0; i < responseScoreList.length; i++) {
                    //getlosserpoint
                    if (responseScoreList[i].Score > getlosserpoint) {
                         getlosserpoint = responseScoreList[i].Score
                    }
                    for (let j = 0; j < this.WalletTransactionArray.length; j++) {
                         if (this.WalletTransactionArray[j].UserId == responseScoreList[i].UserId) {
                              responseScoreList[i].WalletTransactionId = this.WalletTransactionArray[j].WalletTransactionId
                         }
                    }
               }
               let getWinningAmount;
               if(this.gameMode == GAME_TYPES.DEAL){
                    this.log(`Deal rummy on declare of ${this.players[playerIndex].name} responseScoreList is `, responseScoreList);
                    //set the data into the memory
                    let playerData=[];
                    let playerscore={};
                    let maxplayer={Score:0}
                    let i=0;
                    let losserScore = responseScoreList.filter((players)=>{
                         if(players.Score > maxplayer.Score){
                              maxplayer = players
                              i++;
                              
                         }
                         if(i==responseScoreList.length-1)
                              return maxplayer
                    
                    })
                    losserScore = maxplayer;
                    let round = getDealRound(this._id)
                    let setRound;
                    if(round){
                         if(round.round < parseInt(this.metaData.round)-1){
                              this.isResult =true;
                              responseScoreList.forEach((player)=>{
                                   player.AmountChange = 0
                                   if(player.userId!=losserScore.userId){
                                        playerscore={
                                                  mid:player.UserId,
                                                  userId:player.userId,
                                                  Score:player.Score,
                                                  EarnCoin:parseFloat(this.metaData.maxpoints)+parseFloat(losserScore.Score),
                                                  IsWin:true
                                             }
                                   }
                                   else{
                                        playerscore={
                                             mid:player.UserId,
                                             userId:player.userId,
                                             Score:player.Score,
                                             EarnCoin:parseFloat(this.metaData.maxpoints)-parseFloat(losserScore.Score),
                                             IsWin:false
                                        }
                                   }
                                   playerData.push(playerscore)
                                   
                              })
                              setRound = {
                                   _id:this._id,
                                   players:playerData,
                                   round: 1
                              }
                              //setting up the result in player result Earncoin
                              this.players.forEach((player)=>{
                                   playerData.forEach((earncoin)=>{
                                        if(player.userId == earncoin.userId){
                                             player.EarnCoin = earncoin.EarnCoin;
                                        }
                                   })
                              })
                              setDealRound(setRound);
                              //hashmap the rounds details by the usersID
                              let getround = getDealRound(this._id)
                              let mapScore ={}
                              for(let user of getround.players){
                                   mapScore[user.userId]= user;
                              }
                              getWinningAmount = getContestDetails.wa;
                              this.gameState = GAME_STATES.WAITING;
                              responseScoreList.forEach((player)=>{
                                   if(player.userId==mapScore[player.userId].userId){
                                        player.EarnCoin = mapScore[player.userId].EarnCoin;
                                        player.bonusAmount = 0;
                                        player.AmountChange = 0;
                                        player.WinningAmount = 0;
                                        
                                   }
                              })
                              console.log("Game Ends Now 1 round");
                              console.log(responseScoreList)
                              //restart the rummy after 15 sec
                              setTimeout(async ()=>{
                                        this.initDeck();
                                        //this.toss();
                                        clearTimeout(this.autodeclareTimer);
                                        this.tossV2();
                                        this.initPlayerCards();
                                        this.turnState = "toss"
                                        await this.delay(5000);

                                        this.startGame()

                                        this.players.forEach((player)=>{
                                             delete player.result;
                                        })

                                        this.onFireEventToRoom(this._id,socketEvents.rummy.gameSync,this.eventCards(0))
                                   },parseInt(this.totalRoundTime)+3000)
                              
                         }
                         
                         else{
                              // if(this.dealresult==1){
                              //      this.isResult = false;
                              //      this.dealresult++;
                              // }
                              //else{
                                   this.isResult = true;
                                   console.log("Game Ends Now");
                                   this.turnState = "end";
                                   this.gameState = GAME_STATES.FINISHED;
                                   this.log("Game exit after two round is finised  round= ",round.round)
                                   //push to winning queue
                                   getWinningAmount = getContestDetails.ja;
                                   this.log('All user declard by deal rummy', getWinningAmount)
                                   //create score for deal rummy
                                   let winnerbyEarnCoin = {EarnCoin:0};
                                   let getRound = round;
                                   
                                   let earnCoin=0;
                                   getRound.players.forEach((player)=>{
                                        if(player.userId!=losserScore.userId){
                                             player.EarnCoin = player.EarnCoin + losserScore.Score
                                        }
                                        else{
                                             player.EarnCoin = player.EarnCoin - losserScore.Score
                                        }
                                   })
                                   responseScoreList.forEach((player1)=>{
                                        getRound.players.forEach((player2)=>{
                                             if(player2.userId==player1.userId){
                                                  player2.Score = player1.Score;
                                             }
                                        })
                                   })

                                   let makeResponseForResult = [...responseScoreList];
                                   responseScoreList.forEach((player)=>{
                                        getRound.players.forEach((earn)=>{
                                             if(player.userId == earn.userId){
                                                 player.Score = earn.EarnCoin
                                             }
                                        })
                                   })
                                   //create request for the getContestWinner
                                   let request={
                                        rummyParticipantScore:[],
                                        ContestId:this.contestId,
                                        RoomId:this.roomId
                                   }
                                   request.rummyParticipantScore=makeResponseForResult; 
                                   
                                   var winnerRecord = await intializeRabbitMQ.Instance.Transaction.getContestWinners(request,this._id)
                                   this.log("get winner from procedure")
                                    winnerRecord.forEach((player)=>{
                                        if(player.IsWin){
                                             player.pState = PLAYER_STATE.WON
                                        }
                                        else{
                                             player.pState = PLAYER_STATE.LOST
                                        }
                                    })
                                   // getRound.players.forEach((player)=>{
                                   //      if(player.EarnCoin>winnerbyEarnCoin.EarnCoin){
                                   //           winnerbyEarnCoin = playerscore
                                   //           player.IsWin=true
                                   //           player.pState=PLAYER_STATE.WON
                                   //      }
                                   //      else{
                                   //           player.IsWin=false
                                   //           player.pState=PLAYER_STATE.LOST
                                   //      }

                                   // })
                                   getRound.players.forEach((player)=>{
                                        winnerRecord.forEach((record)=>{
                                             if(record.UserId == player.mid){
                                                  player.IsWin=record.IsWin
                                                  player.pState=record.pState
                                                  player.WinningAmount=record.Amount
                                             }
                                        })
                                   })
                                   
                                   
                                   //setting up the result in player result Earncoin
                                   this.players.forEach((player)=>{
                                        winnerRecord.forEach((earncoin)=>{
                                             if(player.MID == earncoin.UserId){
                                                  player.EarnCoin = earncoin.Score;
                                                  player.pState = earncoin.pState;
                                             }
                                        })
                                   })
                                   
                                   let mapScore ={}
                                   for(let user of getRound.players){
                                        mapScore[user.userId]= user;
                                   }
                                   responseScoreList.forEach((player)=>{
                                        if(player.userId==mapScore[player.userId].userId){

                                             player.EarnCoin = mapScore[player.userId].EarnCoin;
                                             player.IsWin=mapScore[player.userId].IsWin;
                                             player.Score=mapScore[player.userId].Score;
                                             player.bonusAmount = 0;
                                             player.AmountChange = 0;
                                             player.WinningAmount = mapScore[player.userId].WinningAmount;
                                             if(player.IsWin){
                                                  player.AmountChange = parseFloat(player.WinningAmount)
                                             }
                                             else{
                                                  player.AmountChange = (-1)*parseFloat(getWinningAmount)
                                             }
                                             
                                        }
                                   })
                                   
                                   let pushresult = [];
                                   let resultplay = {}
                                   responseScoreList.forEach(element => {
                                        resultplay.UserId = element.UserId;
                                        resultplay.Score = element.EarnCoin;
                                        pushresult.push(resultplay)
                                        resultplay = {};
                                   });
                                   let winningData = {
                                        RoomId: this.roomId.toString(),
                                        ContestId: this.contestId.toString(),
                                        participantScores: pushresult,
                                        ExitCount:0,
                                        AutoExitCount:0,
                                        NormalCount: 2,
                                        IsPrivate:false
                                        
                                   }
                                   
                                   console.log(responseScoreList)
                                   let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToWinningQueue(winningData,this.gameMode)
                                   this.stopTimer();
                                   
                                   // let resultDashboardPlay = {}
                                   // let resultDashboard = [];
                                   // console.log("===============######====##########===================")
                                   // console.log(getRound.players)
                                   // console.log("===============######====##########===================")
                                   // console.log(responseScoreList)

                                   // responseScoreList.forEach(element => {
                                   //      resultDashboardPlay.Score = element.Score;
                                   //      resultDashboardPlay.UserId = element.UserId;
                                   //      resultDashboardPlay.userId = element.userId;
                                   //      resultDashboardPlay.EarnCoin = element.EarnCoin||0;
                                   //      resultDashboardPlay.IsWin = element.IsWin;
                                   //      resultDashboardPlay.Rank = element.Rank;
                                   //      resultDashboardPlay.AmountChange = element.AmountChange;
                                   //      resultDashboard.push(resultDashboardPlay)
                                   //      resultDashboardPlay = {};
                                   // });
                                  
                                   
                                   distoryDealRound(this._id);
                                   this.destroyTable()
                                   
                         }
                    }
                    else{
                         this.isResult =true;
                         // console.log("Game round 1 Ends Now");
                         // this.turnState = "end";
                         // this.gameState = GAME_STATES.ROUND;
                         responseScoreList.forEach((player)=>{
                              player.AmountChange = 0
                              if(player.userId!=losserScore.userId){
                                   playerscore={
                                             mid:player.UserId,
                                             userId:player.userId,
                                             Score:player.Score,
                                             EarnCoin:parseFloat(this.metaData.maxpoints)+parseFloat(losserScore.Score),
                                             IsWin:true
                                        }
                              }
                              else{
                                   playerscore={
                                        mid:player.UserId,
                                        userId:player.userId,
                                        Score:player.Score,
                                        EarnCoin:parseFloat(this.metaData.maxpoints)-parseFloat(losserScore.Score),
                                        IsWin:false
                                   }
                              }
                              playerData.push(playerscore)
                                
                         })
                         setRound = {
                              _id:this._id,
                              players:playerData,
                              round: 1
                         }
                         //setting up the result in player result Earncoin
                         this.players.forEach((player)=>{
                              playerData.forEach((earncoin)=>{
                                   if(player.userId == earncoin.userId){
                                        player.EarnCoin = earncoin.EarnCoin;
                                   }
                              })
                         })
                         setDealRound(setRound);
                         //hashmap the rounds details by the usersID
                         let getround = getDealRound(this._id)
                         let mapScore ={}
                         for(let user of getround.players){
                              mapScore[user.userId]= user;
                         }
                         getWinningAmount = getContestDetails.wa;
                         this.gameState = GAME_STATES.WAITING;
                         responseScoreList.forEach((player)=>{
                              if(player.userId==mapScore[player.userId].userId){
                                   player.EarnCoin = mapScore[player.userId].EarnCoin;
                                   player.bonusAmount = 0;
                                   player.AmountChange = 0;
                                   player.WinningAmount = 0;
                                   
                              }
                         })
                         console.log("Game Ends Now 1 round");
                         console.log(responseScoreList)
                         this.gameState = GAME_STATES.ROUND;
                         this.lastRoundTime = Date.now()
                         //restart the rummy after 15 sec
                         setTimeout(async ()=>{
                                   this.initDeck();
                                   //this.toss();
                                   clearTimeout(this.autodeclareTimer);
                                   this.tossV2();
                                   this.initPlayerCards();
                                   this.turnState = "toss"
                                   await this.delay(5000);
                                   this.startGame()
                                   this.players.forEach((player)=>{
                                        delete player.result;
                                   })

                                   this.onFireEventToRoom(this._id,socketEvents.rummy.gameSync,this.eventCards(0))
                              },parseInt(this.totalRoundTime)+3000)
                         
                    }
                    
               }
               if(this.gameMode == GAME_TYPES.POINT){
                    this.isResult = true;
                    this.log(`Point rummy on declare of ${this.players[playerIndex].name} responseScoreList is `, responseScoreList);
                    //calculate winning amount
                    //calculateAmountv3
                    getWinningAmount = this.calculateAmountv3(getlosserpoint, getContestDetails.pointsvalue, getContestDetails.noofplayers, getContestDetails.maxpoints, getContestDetails.commisionpercent, getContestDetails.discountpercent, getContestDetails.bonuspercent)
                    this.log('All user declard by point rummy', getWinningAmount)
                    for (let index = 0; index < responseScoreList.length; index++) {
                         if (responseScoreList[index].IsWin) {
                              responseScoreList[index].WinningAmount = getWinningAmount.won;
                              responseScoreList[index].bonusAmount = 0;
                              responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                         }
                         else {
                              responseScoreList[index].WinningAmount = getWinningAmount.loss;
                              responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                              responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                         }
                    }
                    console.log("Game Ends Now");
                    this.turnState = "end";
                    this.gameState = GAME_STATES.FINISHED;
     
                    let pushresult = [];
                    let resultplay = {}
                    responseScoreList.forEach(element => {
                         resultplay.UserId = element.UserId;
                         resultplay.Score = element.Score;
                         resultplay.IsWin = element.IsWin;
                         resultplay.Rank = element.Rank;
                         resultplay.WinningAmount = element.WinningAmount.toFixed(2);
                         resultplay.BonusAmount = element.bonusAmount;
                         resultplay.WalletTransactionId = element.WalletTransactionId;
                         resultplay.PlayerState = element.PlayerState;
                         //resultplay.gameMode = this.gameMode;
                         pushresult.push(resultplay)
                         resultplay = {};
                    });
                    let winningData = {
                         RoomId: this.roomId.toString(),
                         ContestId: this.contestId.toString(),
                         participantScores: pushresult,
                         //ExitCount:0,
                         //AutoExitCount:1,
                         //NormalCount: 1,
                         IsPrivate:false
                    }
     
                    console.log(responseScoreList)
                    let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToWinningQueue(winningData,this.gameMode)
                    this.stopTimer();
                    this.destroyTable()
               }

          
          }
          let resultDashboardPlay = {}
          let resultDashboard = [];
          responseScoreList.forEach(element => {
               
               resultDashboardPlay.UserId = element.UserId;
               resultDashboardPlay.userId = element.userId;
               resultDashboardPlay.Score = element.Score;
               resultDashboardPlay.EarnCoin = element.EarnCoin||0;
               resultDashboardPlay.IsWin = element.IsWin;
               resultDashboardPlay.Rank = element.Rank;
               resultDashboardPlay.AmountChange = element.AmountChange;
               resultDashboard.push(resultDashboardPlay)
               resultDashboardPlay = {};
          });
          const response = {
               playedBy: userId,
               _id: this.tableId,
               gameState: this.gameState,
               eventCode: "declare",
               firstdeclare: this.firstdeclared,
               playerIndex: playerIndex,
               cards: this.players[playerIndex].cards,
               deck: this.deck.length,
               draw: this.draw,
               currentTurnIndex: this.currentTurnIndex,
               turnState: this.turnState,
               players: this.players,
               metaData:this.metaData,
               result: resultDashboard || [],
               isValidDeclaration: playerScore == 0 ? true : false,
               finishedByIndex: this.finishedByIndex,
               dealRummyRoundTime:  parseInt(this.totalRoundTime)|| 15000,
               isResult:this.isResult,

          };
          this.log(`Response on declareV2 event of ${this.players[playerIndex].name}`, response);
          this.result = resultDashboard;
          console.log(this.result)
          //distroyTable(this._id)
          this.sendLogInMongo("declare", response)
          return response;
     }
     onSyncMelds(userId, playerMelds) {

          // const playerIndex = this.currentTurnIndex||0;
          const playerIndex = this.playerIndex(userId);
          this.log('Sync melds for player ', this.players[playerIndex].name, userId, playerMelds)
          const melds = this.parseMelds(playerMelds) // {meldLocation:1,cards:[2,3,4], meldType: ""}
          melds.sort((a, b) => a.meldLocation - b.meldLocation);
          this.players[playerIndex].melds = melds;
          // this.players[playerIndex].cards = 
          return { updated: true };
     }
     validateMeld(cards) {
          if (this.isValidMeldLength(cards) == false) {
               return {
                    score: this.calculateCardScore(cards),
                    isValid: false,
                    type: "invalid"
               }
          }
          const isSet = this.isMeldSet(cards);
          if (isSet) {
               return { isValid: true, type: "set", score: 0 };
          }
          const isSeq = this.isMeldSeq(cards);
          if (isSeq) {
               return { isValid: true, type: "pureSeq", score: 0 };
          }
          return {
               score: this.calculateCardScore(cards),
               isValid: false,
               type: "invalid"
          }
     }
     calculateCardScore(cards) {
          let sum = 0;
          for (let card of cards) {
               if (!card.isWildCard) {
                    if (card.rank == 'Q' || card.rank == 'K' || card.rank == 'J' || card.rank == 'A') {
                         sum += 10
                    }
                    else {
                         sum += card.value + 1;
                    }
               }
               else {
                    sum += 0
               }
          }
          return sum;
     }
     isMeldSet(cards) {
          const begin = cards[0].value;
          for (let i = 1; i < cards.length; i++) {
               if (cards[i].value != begin) { return false };
          }
          return true;
     }
     isMeldSeq(cards) {
          const mainSuit = cards[0].suit;
          for (let i = 1; i < cards.length; i++) {
               const sameSuit = this.isSameSuit(cards[i].suit, mainSuit);
               const seq = this.isSequential(cards[i], cards[i - 1]); // 0,1,2,3
               if ((!sameSuit || !seq)) {
                    return false;
               }
          }
          return true;
     }
     isSameSuit(suit, mainSuit) {
          if (suit == mainSuit) {
               return true;
          }
          return false;
     }
     isSequential(current, previous) {
          if (current.wildCard) {
               return true;
          }
          else if (previous.wildCard) {
               return true;
          }
          else
               return current.value == (previous.value + 1);
     }
     isValidMeldLength(cards) {
          if (cards.length >= 3) {
               return true;
          }
          return false;
     }
     findPlayerCardById(playerIndex, cardId) {
          let card = this.cardsMap.get(cardId);
          // // console.log("\n findPlayerCardById player cards ", JSON.stringify(this.players[playerIndex].cards));
          // this.players[playerIndex].cards.forEach(cardInHand => {
          //      if (cardInHand.id == cardId) {
          //           // console.log("\n found cardInHand ", cardInHand);
          //           card = cardInHand;
          //      }
          // });
          // if (!card) {
          //      const message = "Invalid cardId = " + cardId;
          //      throw customError.createCustomError(400, message);
          // }
          return card;
     }
     playerIndex(userIdRequest) {
          let userId = userIdRequest.toLowerCase();
          let playerIndex = null;
          this.players.forEach((player, index) => {
               if (userId == player.userId) {
                    playerIndex = index;
               }
          });
          if (playerIndex != null)
               return playerIndex;
          throw customError.createCustomError(400, "Player not found in the game");
     }
     eventCards(playerIndex) {
          console.log("cards : ", JSON.stringify(this.players[playerIndex].cards));
          if(this.round ==2){
               let getround = getDealRound(this._id)
               let mapScore ={}
               for(let user of getround.players){
                    mapScore[user.userId]= user;
               }

               this.players.forEach((player)=>{
                    if(player.userId==mapScore[player.userId].userId){
                         player.EarnCoin = mapScore[player.userId].EarnCoin;
                    }
               });
          }
          else{
               this.players.forEach((player)=>{
                    player.EarnCoin = parseInt(this.metaData.maxpoints)
               }); 
          }
          

          const response = {
               eventCode: "cards",
               cards: this.players[playerIndex].cards, // hand
               draw: this.draw,
               wildCard: this.wildCard,
               currentTurnIndex: this.currentTurnIndex,
               turnState: this.turnState,
               players: this.players,
               totalTurnTime: this.totalTurnTime,
               gameState: this.gameState,
               changeTurn: true,

          };
          
          this.sendLogInMongo("cards", response)
          return response;
     }
     onSyncGame(userId) {
          const playerIndex = this.playerIndex(userId);
          const diff = Date.now() - this.lastTurnTime;
          const diffRound = Date.now() - this.lastRoundTime;
          this.log("Last turn time on game sync ===", this.lastTurnTime)
          this.log("Diff ===", diff)

          let timePassed = (diff > this.totalTurnTime) ? this.totalTurnTime : diff;
          let timePassedInRound = (diffRound > this.totalRoundTime) ? this.totalRoundTime : diffRound;
          console.log("onSyncGame : ", playerIndex);
          const response = {
               eventCode: "gameSync",
               // cards: this.players[playerIndex].cards, // hand
               // melds: this.players[playerIndex].melds,
               deck: this.deck.length,
               draw: this.draw,
               currentTurnIndex: this.currentTurnIndex,
               turnState: this.turnState,
               players: this.players,
               wildCard: this.wildCard,
               gameState: this.gameState,
               timeRemaining: timePassed,
               totalTurnTime: this.totalTurnTime,
               metaData: this.metaData,
               result: this.result,
               roomId: this.roomId,
               turnCount: this.turnCount,
               declareTurnTime: this.finishedOn ? DECLARE_TIME - (Date.now() - this.finishedOn) : 0,
               finishedByIndex: this.finishedByIndex,
               dealRummyRoundTime:  this.totalRoundTime - parseInt(timePassedInRound),
               isResult:this.isResult,
          };
          console.log("\n \n onsync game ", JSON.stringify(this.players));
          this.sendLogInMongo("gameSync", response)
          return response;
     }
     onEntryPointGame(userId) {
          const playerIndex = this.playerIndex(userId);
          const diff = Date.now() - this.lastTurnTime;
          const diffRound = Date.now() - this.lastRoundTime;
          this.log("Last turn time on game sync ===", this.lastTurnTime)
          this.log("Diff ===", diff)

          let timePassed = (diff > this.totalTurnTime) ? this.totalTurnTime : diff;
          let timePassedInRound = (diffRound > this.totalRoundTime) ? this.totalRoundTime : diffRound;
          console.log("onSyncGame : ", playerIndex);
          const response = {
               eventCode: "onGameEntry",
               currentTime: new Date(),
               deck: this.deck.length,
               draw: this.draw,
               currentTurnIndex: this.currentTurnIndex,
               turnState: this.turnState,
               players: this.players,
               wildCard: this.wildCard,
               gameState: this.gameState,
               timeRemaining: timePassed,
               totalTurnTime: this.totalTurnTime,
               metaData: this.metaData,
               result: this.result,
               roomId: this.roomId,
               turnCount: this.turnCount,
               declareTurnTime: this.finishedOn ? DECLARE_TIME - (Date.now() - this.finishedOn) : 0,
               finishedByIndex: this.finishedByIndex,
               dealRummyRoundTime:  this.totalRoundTime - parseInt(timePassedInRound),
               isResult:this.isResult,
          };
          console.log("\n \n onGameEntry game ", JSON.stringify(this.players));
          this.sendLogInMongo("onGameEntry", response)
          return response;
     }
     onAppDisconnect(userId) {
          this.log(" app diconnect game ", JSON.stringify(this.players));
          return ;
     }
     async addBalanceOnGameEnd() {
          console.log("\n addBalanceOnGameEnd : ");
          let lowerScore = 0;
          this.players.forEach(player => {
               if (player.pState != PLAYER_STATE.WON) {
                    lowerScore = player?.result?.score || 0;
               }
          });
          console.log("\n lowerScore : ", lowerScore);
          this.players.forEach(async (player) => {
               if (player.pState == PLAYER_STATE.WON) {
                    const d = await commonFunctions.addUserBalance(this.contestId, player.token, this._id, true, lowerScore);
                    // player.result.amount = d;
                    console.log("\n \n Amount Won : ", d);
                    player.winLose = d;
               }
               else {
                    const d = await commonFunctions.addUserBalance(this.contestId, player.token, this._id, false, lowerScore);
                    // player.result.amount = d;
                    console.log("\n \n Amount Lost : ", d);
                    player.winLose = d;
               }
          });
     }
     async checkWinnerOnExit(roomId, contestId, LosserPlayerState) {
          let responseScore;
          let responseScoreList = [];
          let active = 0;
          for (let i = 0; i < this.players.length; i++) {
               if (this.players[i].pState == PLAYER_STATE.PLAYING) {
                    active++;
               }
          }
          // when only one player is left in the game
          if (active <= 1) {
               this.stopTimer();
               this.turnState = "end"
               this.gameState = GAME_STATES.FINISHED;
               for (let i = 0; i < this.players.length; i++) {
                    responseScore = {}
                    if (this.players[i].pState == PLAYER_STATE.PLAYING) {
                         this.players[i].pState = PLAYER_STATE.WON;
                         responseScore.UserId = this.players[i].MID;
                         responseScore.Score = 0;
                         responseScore.IsWin = true;
                         responseScore.Rank = 1;
                         responseScore.userId = this.players[i].DID;
                         responseScore.PlayerState = PLAYER_STATE.WON;

                    }
                    else {
                         let score = 80;
                         if (this.players[i].drop == "first") {
                              score = 20;
                         }
                         if (this.players[i].drop == "middle") {
                              score = 40;
                         }
                         responseScore.UserId = this.players[i].MID;
                         responseScore.Score = score;
                         responseScore.IsWin = false;
                         responseScore.Rank = 2;
                         responseScore.userId = this.players[i].DID;
                         responseScore.PlayerState = LosserPlayerState;

                    }
                    responseScoreList.push(responseScore);
               }
               return responseScoreList;
          }

     }
     onLeaveRoom(userId) {

     }
     async onExitGame(userId) {
          activeGame.dec();
          let exitby;
          let responseScoreList;
          this.isResult =true;
          let table_id = this.tableId
          if (this.numberofExit == 0) {
               exitby = userId;
               this.numberofExit++;
               const playerIndex = this.playerIndex(userId);
               let playerScore
               this.log('Player exit from game ', this.players[playerIndex].name, 'Melds=<', this.players)
               if(this.gameMode == GAME_TYPES.DEAL){
                    playerScore = await this.getLoserScoreOnExit(this.players[playerIndex].melds,playerIndex)
                    this.players[playerIndex].drop = "first";
                    if (this.players[playerIndex].turnNo > 0) {
                         this.players[playerIndex].drop = "middle";
                    }
                    console.log("==========Lossing PLayer data===========")
                    console.log(this.players[playerIndex])
                    console.log("++++++++++++++++++"+playerScore+"++++++++++++++++++")
                    const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

                    this.setPlayerResult(playerIndex, playerScore, validRules, []);
                    this.players[playerIndex].pState = PLAYER_STATE.EXIT;

                    
               }
               if(this.gameMode == GAME_TYPES.POINT){
                    playerScore = 20;
                    this.players[playerIndex].drop = "first";
                    if (this.players[playerIndex].turnNo > 0) {
                         playerScore = 40;
                         this.players[playerIndex].drop = "middle";
                    }
                    console.log("==========Lossing PLayer data===========")
                    console.log(this.players[playerIndex])
                    const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

                    this.setPlayerResult(playerIndex, playerScore, validRules, []);
                    this.players[playerIndex].pState = PLAYER_STATE.EXIT;
               }
               
               
               // if (this.players.find(o => o.userId === 'bot-player-01') != undefined) {
               //      //remove the score from meld object in bot player
               //      let newMeld = this.players[1].melds
               //      let meldsTry = []
               //      for (let index = 0; index < newMeld.length; index++) {
               //           //remove score
               //           let getlocation = newMeld[index].meldLocation
               //           let getmeldType = newMeld[index].meldType
               //           let getcards = newMeld[index].cards

               //           meldsTry.push({
               //                meldLocation: getlocation,
               //                meldType: getmeldType,
               //                cards: getcards
               //           })
               //      }
               //      this.players[1].melds = meldsTry;
               // }
               loggerError.gameLog(this._id, "drop of the player ", this.players);

               let getOppenentIndex
               //check cardpicked  by opponnet or not
               getOppenentIndex = (playerIndex + 1) % (this.players.length);
               if (this.players[getOppenentIndex].cards.length > 13) {
                    this.log('Opponent has more than 13 cards', getOppenentIndex)
                    //remove the card from opponent hand
                    const cardIdToRemove = this.onTimeoutRemovePickedupCard(getOppenentIndex);
                    this.removeCardFromPlayerHand(getOppenentIndex, cardIdToRemove);
                    this.removeCardFromPlayerMelds(getOppenentIndex, cardIdToRemove)


               }
               await this.makeResultForOther(playerIndex)
               responseScoreList = await this.checkWinnerOnExit(this.roomId, this.contestId, PLAYER_STATE.EXIT)
               loggerError.gameLog(this._id, "drop of the player check winner " + this.players);

               
               //var transaction = new Transaction();
               let getlosserpoint = 0;
               let getContestDetails = await intializeRabbitMQ.Instance.Transaction.getContestDetails(this.contestId.toString(),this.gameMode)

               //calculate losser point
               for (let i = 0; i < responseScoreList.length; i++) {
                    //getlosserpoint
                    if (responseScoreList[i].Score > getlosserpoint) {
                         getlosserpoint = responseScoreList[i].Score
                    }
                    for (let j = 0; j < this.WalletTransactionArray.length; j++) {
                         if (this.WalletTransactionArray[j].UserId == responseScoreList[i].UserId) {
                              responseScoreList[i].WalletTransactionId = this.WalletTransactionArray[j].WalletTransactionId
                         }
                    }
               }
               let getWinningAmount
               if(this.gameMode == GAME_TYPES.DEAL){
                    getWinningAmount = 
                    {
                         won:getContestDetails.wa,
                         joiningFee:getContestDetails.ja,
                         bonusAmount:getContestDetails.bonuspercent,
                         loss:0
                    }
               }
               if(this.gameMode == GAME_TYPES.POINT){
                    getWinningAmount = this.calculateAmountv3(getlosserpoint, getContestDetails.pointsvalue, getContestDetails.noofplayers, getContestDetails.maxpoints, getContestDetails.commisionpercent, getContestDetails.discountpercent, getContestDetails.bonuspercent)
               }
               //calculate winning amount

               //put amount to request for push to winning queue
               //calculateAmountv1
               if (false) {
                    for (let index = 0; index < responseScoreList.length; index++) {
                         if (responseScoreList[index].IsWin) {
                              responseScoreList[index].WinningAmount = getWinningAmount.won + getWinningAmount.joiningFee;
                              responseScoreList[index].bonusAmount = 0;
                              responseScoreList[index].AmountChange = getWinningAmount.won;
                         }
                         else {
                              responseScoreList[index].WinningAmount = getWinningAmount.returnAmount + getWinningAmount.discoutnAmount;
                              responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                              responseScoreList[index].AmountChange = getWinningAmount.loss * (-1);
                         }
                    }
               }
               //calculateAmountv2
               if (false) {
                    for (let index = 0; index < responseScoreList.length; index++) {
                         if (responseScoreList[index].IsWin) {
                              responseScoreList[index].WinningAmount = getWinningAmount.won;
                              responseScoreList[index].bonusAmount = 0;
                              responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                         }
                         else {
                              responseScoreList[index].WinningAmount = getWinningAmount.loss;
                              responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                              responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                         }
                    }
               }
               //calculateAmountv3
               if(this.gameMode == GAME_TYPES.POINT){
                    for (let index = 0; index < responseScoreList.length; index++) {
                         if (responseScoreList[index].IsWin) {
                              responseScoreList[index].WinningAmount = getWinningAmount.won;
                              responseScoreList[index].bonusAmount = 0;
                              responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                         }
                         else {
                              responseScoreList[index].WinningAmount = getWinningAmount.loss;
                              responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                              responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                         }
                    }
               }
               


               

               // let amount = parseFloat(getWinningAmount.returnAmount)+ parseFloat(getWinningAmount.returnAfterDiscount);
               // responseScoreList[i].WinningAmount= ((amount > 0 ) ? amount : 0 );


               //{"RoomId":"13467","ContestId":"1","participantScores":[{"UserId":"26","Score":20, "WinningAmount":4.00, "Rank":2, "IsWin":false},{"UserId":"315807","Score":10, "WinningAmount":6.00, "Rank":1, "IsWin":true}],"IsPrivate":false}    
               this.stopTimer();

               // let resultDashboardPlay = {}
               // let resultDashboard = [];

               // responseScoreList.forEach(element => {
               //      resultDashboardPlay.UserId = element.UserId;
               //      resultDashboardPlay.Score = element.Score;
               //      resultDashboardPlay.IsWin = element.IsWin;
               //      resultDashboardPlay.Rank = element.Rank;
               //      resultDashboardPlay.AmountChange = element.AmountChange;
               //      resultDashboard.push(resultDashboardPlay)
               //      resultDashboardPlay = {}
               // });
               
               responseScoreList.forEach((player)=>{
                    this.players.forEach((element)=>{
                         if(player.userId == element.userId){
                              console.log(element.result.score)
                              if(typeof element.EarnCoin === "undefined"){

                                   element.EarnCoin = element.result.score;
                              }
                              player.Score = element.result.score;
                         }
                    })
               })
               let getHigherPoint = await this.getMaxpoint()
               //swap earnCoin
               for(let i=0;i<this.players.length;i++){
                    let temp = this.players[i].result.score;
                    if(getHigherPoint == temp){
                         if(this.round!=1 ){
                              this.players[i].EarnCoin = parseFloat(this.players[i].EarnCoin)-getHigherPoint;
                         }
                         else{
                              this.players[i].EarnCoin = parseFloat(this.metaData.maxpoints)-getHigherPoint;
                         }
                    }
                    else{
                         if(this.round!=1 ){
                              this.players[i].EarnCoin= parseFloat(this.players[i].EarnCoin)+getHigherPoint;
                         }
                         else{
                              this.players[i].EarnCoin= parseFloat(this.metaData.maxpoints)+getHigherPoint;
                         }
                    }
                    //break;
               }
               //feeling delight
               if(this.gameMode == GAME_TYPES.DEAL){
                    //make result for sending in procedure
                    responseScoreList.forEach((player)=>{
                         this.players.forEach((earn)=>{
                              if(player.userId == earn.userId){
                                        player.Score = earn.EarnCoin
                              }
                         })
                    })
                    //create request for the getContestWinner
                    let request={
                         rummyParticipantScore:[],
                         ContestId:this.contestId,
                         RoomId:this.roomId
                     }
                    request.rummyParticipantScore=responseScoreList; 
                    this.log(this._id, "Request Winner record from procedure after game exit",winnerRecord,request)
                    var winnerRecord = await intializeRabbitMQ.Instance.Transaction.getContestWinners(request,this._id)
                    this.log(this._id, "Winner record from procedure after game exit",winnerRecord)
                    winnerRecord.forEach((player)=>{
                         if(player.IsWin){
                              player.pState = PLAYER_STATE.WON
                         }
                         else{
                              player.pState = PLAYER_STATE.LOST
                         }
                    })
                    responseScoreList.forEach((responselist)=>{
                         winnerRecord.forEach((record)=>{
                              if(record.UserId == responselist.UserId){
                                   responselist.IsWin = record.IsWin
                                   if (record.IsWin) {
                                        responselist.WinningAmount = record.Amount;
                                        responselist.bonusAmount = 0;
                                        responselist.AmountChange = record.Amount;
                                   }
                                   else{
                                        responselist.WinningAmount = record.Amount;
                                        responselist.bonusAmount = 0;
                                        responselist.AmountChange = getContestDetails.ja * (-1);
                                   }
                              }
                         })
                    })
                    
               }
               let pushresult = [];
               let resultplay = {}
               this.log("GameMode in gameSync = ",this.gameMode)
               responseScoreList.forEach(element => {
                    resultplay.UserId = element.UserId;
                    
                    if(this.gameMode==GAME_TYPES.POINT){
                         if(element.IsWin){
                              resultplay.WinningAmount = getWinningAmount.won;
                         }
                         else{
                              resultplay.WinningAmount = getWinningAmount.loss;
                         }
                         
                         resultplay.Score = element.Score;
                         resultplay.IsWin = element.IsWin;
                         resultplay.Rank = element.Rank;
                         resultplay.BonusAmount = element.bonusAmount;
                         resultplay.WalletTransactionId = element.WalletTransactionId;
                         resultplay.PlayerState = element.PlayerState;
                         //resultplay.gameMode = this.gameMode;
                    }
                    if(this.gameMode==GAME_TYPES.DEAL){
                         resultplay.Score = element.Score;
                    }
                    
                    pushresult.push(resultplay)
                    resultplay = {}
               });
               let winningData={}
               if(this.gameMode==GAME_TYPES.DEAL){
                    winningData = {
                         RoomId: this.roomId.toString(),
                         ContestId: this.contestId.toString(),
                         participantScores: pushresult,
                         ExitCount:0,
                         AutoExitCount:1,
                         NormalCount: 1,
                         IsPrivate:false
                    }
               }
               if(this.gameMode==GAME_TYPES.POINT){
                    winningData = {
                         RoomId: this.roomId.toString(),
                         ContestId: this.contestId.toString(),
                         participantScores: pushresult,
                         //ExitCount:0,
                         //AutoExitCount:1,
                         //NormalCount: 1,
                         IsPrivate:false
                    }
               }


               //let winningData = this.getWinningUserData(request)
               // let rabbitMQ = new RabbitMQ();
               // await rabbitMQ.setupConnection();
               // console.log(winningData)
               this.log('Winning data on game exit =>', winningData)
               let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToWinningQueue(winningData,this.gameMode)
               console.log(winningData)
               responseScoreList.forEach((player)=>{
                    this.players.forEach((element)=>{
                         if(player.userId == element.userId){
                              player.Score = element.result.score
                         }
                    })
               })

               const response = {
                    playedBy: userId,
                    _id: this.tableId,
                    gameState: this.gameState,
                    eventCode: "exitGame",
                    turnState: this.turnState,
                    players: this.players,
                    result: responseScoreList,
                    metaData:this.metaData
               }
               loggerError.gameLog(this._id, "Game exit after drop or exit game", this.players.toString())
               this.result = responseScoreList;
               this.log('Response of game exit ', response);
               console.log(this.result)
               // distroyTable(this._id)
               this.destroyTable()
               return response;
          }
          else {
               //do nothing
               const doresponse = {
                    playedBy: exitby,
                    _id: table_id,
                    gameState: this.gameState,
                    eventCode: "exitGame",
                    turnState: this.turnState,
                    players: this.players,
                    result: responseScoreList
               }
               return doresponse;
          }
          
     }
     async onExitGameV2(userId) {
          let exitby;
          let responseScoreList;
          let resp;
          let table_id = this.tableId
          if (this.numberofExit == 0) {
               exitby = userId;
               this.numberofExit++;
               const playerIndex = this.playerIndex(userId);
               this.log('Player exit from game ', this.players[playerIndex].name, 'Melds=<', this.players)
               let playerScore = 20;
               this.players[playerIndex].drop = "first";
               if (this.players[playerIndex].turnNo > 0) {
                    playerScore = 40;
                    this.players[playerIndex].drop = "middle";
               }
               console.log("==========Lossing PLayer data===========")
               console.log(this.players[playerIndex])
               const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };

               this.setPlayerResult(playerIndex, playerScore, validRules, []);
               this.players[playerIndex].pState = PLAYER_STATE.EXIT;

               loggerError.gameLog(this._id, "drop of the player ", this.players);

               //check cardpicked  by opponnet or not
               let oppenentIndex = (playerIndex + 1) % (this.players.length);
               if (this.players[oppenentIndex].cards.length > 13) {
                    this.log('Opponent has more than 13 cards', oppenentIndex)
                    //remove the card from opponent hand
                    const cardIdToRemove = this.onTimeoutRemovePickedupCard(oppenentIndex);
                    this.removeCardFromPlayerHand(oppenentIndex, cardIdToRemove);
                    this.removeCardFromPlayerMelds(oppenentIndex, cardIdToRemove)
               }
               await this.makeResultForOtherV2(playerIndex)
               responseScoreList = await this.checkWinnerOnExit(this.roomId, this.contestId, PLAYER_STATE.EXIT)
               loggerError.gameLog(this._id, "drop of the player check winner " + this.players);

               //var transaction = new Transaction();
               let getlosserpoint = 0;
               let contestDetails = await intializeRabbitMQ.Instance.Transaction.getContestDetails(this.contestId.toString(),this.gameMode)

               //calculate losser point
               for (let i = 0; i < responseScoreList.length; i++) {
                    //getlosserpoint
                    if (responseScoreList[i].Score > getlosserpoint) {
                         getlosserpoint = responseScoreList[i].Score
                    }
                    for (let j = 0; j < this.WalletTransactionArray.length; j++) {
                         if (this.WalletTransactionArray[j].UserId == responseScoreList[i].UserId) {
                              responseScoreList[i].WalletTransactionId = this.WalletTransactionArray[j].WalletTransactionId
                         }
                    }
               }
               let getWinningAmount
               if(this.gameMode == GAME_TYPES.DEAL){
                    getWinningAmount = getContestDetails.winningAmount;
               }
               if(this.gameMode == GAME_TYPES.POINT){
                    getWinningAmount = this.calculateAmountv3(getlosserpoint, getContestDetails.pointsvalue, getContestDetails.noofplayers, getContestDetails.maxpoints, getContestDetails.commisionpercent, getContestDetails.discountpercent, getContestDetails.bonuspercent)
               }
               //put amount to request for push to winning queue
               //calculateAmountv3
               for (let index = 0; index < responseScoreList.length; index++) {
                    if (responseScoreList[index].IsWin) {
                         responseScoreList[index].WinningAmount = getWinningAmount.won;
                         responseScoreList[index].bonusAmount = 0;
                         responseScoreList[index].AmountChange = getWinningAmount.won - getWinningAmount.joiningFee;
                    }
                    else {
                         responseScoreList[index].WinningAmount = getWinningAmount.loss;
                         responseScoreList[index].bonusAmount = getWinningAmount.bonusAmount;
                         responseScoreList[index].AmountChange = (getWinningAmount.joiningFee - getWinningAmount.loss) * (-1);
                    }
               }

               let pushresult = [];
               let resultplay = {}
               responseScoreList.forEach(element => {
                    resultplay.UserId = element.UserId;
                    resultplay.Score = element.EarnCoin;
                    resultplay.IsWin = element.IsWin;
                    resultplay.Rank = element.Rank;
                    resultplay.WinningAmount = element.WinningAmount.toFixed(2);
                    resultplay.BonusAmount = element.bonusAmount;
                    resultplay.WalletTransactionId = element.WalletTransactionId;
                    resultplay.PlayerState = element.PlayerState;
                    resultplay.gameMode = this.gameMode;
                    pushresult.push(resultplay)
                    resultplay = {}
               });
               let winningData = {
                    RoomId: this.roomId.toString(),
                    ContestId: this.contestId.toString(),
                    participantScores: pushresult,
                    ExitCount:1,
                    AutoExitCount:0,
                    NormalCount: 1,
                    IsPrivate:false
               }

               let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToWinningQueue(winningData,this.gameMode)
               console.log(winningData)
               this.stopTimer();

               let resultDashboardPlay = {}
               let resultDashboard = [];
               responseScoreList.forEach(element => {
                    resultDashboardPlay.UserId = element.UserId;
                    resultDashboardPlay.Score = element.Score;
                    resultDashboardPlay.IsWin = element.IsWin;
                    resultDashboardPlay.Rank = element.Rank;
                    resultDashboardPlay.AmountChange = element.AmountChange;
                    resultDashboard.push(resultDashboardPlay)
                    resultDashboardPlay = {}
               });

               resp = {
                    playedBy: userId,
                    _id: this.tableId,
                    gameState: this.gameState,
                    eventCode: "exitGame",
                    turnState: this.turnState,
                    players: this.players,
                    result: responseScoreList
               }
               loggerError.gameLog(this._id, "Game exit after drop or exit game", this.players.toString())
               this.result = responseScoreList;
               this.log('Response of game exit ', response);
               console.log(this.result)
               // distroyTable(this._id)
               this.destroyTable()
          }
          else {
               //do nothing
               resp = {
                    playedBy: exitby,
                    _id: table_id,
                    gameState: this.gameState,
                    eventCode: "exitGame",
                    turnState: this.turnState,
                    players: this.players,
                    result: responseScoreList
               }
          }
          return resp

     }
     IsSet(allCards = []) {
          if (allCards.length < 3) {
               return false;
          }
          const wildCards = allCards.filter(card => card.isWildCard);
          allCards = allCards.filter(card => !card.isWildCard);
          if (allCards.length + wildCards.length && allCards.length > 0) {
               const TypeOfSet = allCards[0].value;
               const setCards = [];
               const allTypeUsed = {};
               for (let i = 0; i < allCards.length; i++) {
                    if (allCards[i].value == TypeOfSet) {
                         if (!allTypeUsed[allCards[i].suit]) {
                              setCards.push(allCards[i]);
                              allTypeUsed[allCards[i].suit] = true;
                         }
                         else {
                              return false;
                         }
                    }
                    else {
                         return false;
                    }
               }
               for (let i = 0; i < setCards.length; i++) {
                    if (setCards[i] == null && wildCards.length > 0) {
                         setCards[i]
                    }
               }
          }
          else {
               return false;
          }
     }
     IsRealSeq(allCards = []) {
          if (allCards.length <= 2) {
               return false;
          }
          const setCards = new Array(14);
          let KeyCount = 0, i = 0, FilledStart = -1, FilledEnd = 15;
          let counter = allCards.length;
          for (let i = 0; i < allCards.length; i++) {
               if (setCards[allCards[i].value - 1] == null) {
                    setCards[allCards[i].value - 1] = allCards[i];
                    if (allCards[i].value - 1 == 0) {
                         setCards[13] = allCards[i];
                    }
               }
               else {
                    return false;
               }
          }
          for (let i = 0; i < setCards.length; i++) {
               if (setCards[i] != null) {
                    if (FilledStart == -1) {
                         FilledStart = i;
                    }
                    counter--;
               }
               else {
                    if (FilledStart > -1 && counter == 0) {
                         FilledEnd = (i - 1);
                         break;
                    }
                    else if (FilledStart > -1 && counter > 0) {
                         FilledEnd = (i - 1);
                         counter = allCards.length;
                    }
               }
          }
          if (FilledStart > -1 && counter == 0) {
               if (FilledEnd == 15) {
                    FilledEnd = i - 1;
               }
               return true;
          }
          else {
               return false;
          }
          //return false;
     }
     IsSeq(allCards = []) {
          if (allCards.length < 3) {
               return false;
          }
          const wildCards = allCards.filter(card => card.isWildCard);
          allCards = allCards.filter(card => !card.isWildCard);
          const setCards = new Array(14);
          let KeyCount = 0, i = 0, FilledStart = -1, FilledEnd = 15,
               counter = allCards.Count + wildCards.Count,
               WildCardcounter = wildCards.Count;
          if (allCards.length == 1 && wildCards.length == 2) {
               return true;
          }
          for (let i = 0; i < allCards.length; i++) {
               if (setCards[allCards[i].value - 1] == null) {
                    setCards[allCards[i].value - 1] = allCards[i];
                    if (allCards[i].value - 1 == 0) {
                         setCards[13] = allCards[i];
                    }
               }
               else {
                    return false;
               }
          }
          for (let i = 0; i < setCards.length; i++) {
               if (setCards[i] != null) {
                    if (FilledStart == -1) {
                         FilledStart = i;
                    }
                    counter--;
               }
               else {
                    if (FilledStart != -1 && WildCardcounter > 0) {
                         WildCardcounter--;
                         counter--;
                    }
                    else if (FilledStart > -1 && counter == 0) {
                         FilledEnd = i - 1;
                         break;
                    }
                    else if (FilledStart > -1 && counter > 0) {
                         FilledStart = -1;
                         counter = allCards.length + wildCards.length;
                         WildCardcounter = WildCardcounter = wildCards.length;
                    }
               }
          }
          if (FilledStart > -1 && counter - WildCardcounter == 0) {
               if (FilledEnd == 15) {
                    FilledEnd = i - 1;
               }
               return true;
          }
          else {
               return false;
          }
     }
     removeWildfromMeld(cardtoRemove) {
          let meld = this.Botmield;
          for (let index = 0; index < meld.length; index++) {
               for (let card = 0; card < meld[index].length; card++) {
                    if (meld[index][card].id == cardtoRemove.id) {
                         meld[index].splice(card, 1)
                         break;
                    }
               }
          }
          return meld;
     }
     delay(ms) {

          return new Promise(resolve => setTimeout(resolve, ms));
     }
     calculateAmountv1(loserPoint, pointValue, playerCount, totalPoint, plaformCom, discount, bonus) {
          let playerLoss = parseFloat(loserPoint) * parseFloat(pointValue);

          let joinnngFee = parseFloat(pointValue) * parseFloat(totalPoint);
          let platformFee = (parseFloat(playerLoss) / 100) * parseFloat(plaformCom);
          let playerWon = parseFloat(playerLoss) - parseFloat(platformFee);
          let potValue = parseFloat(joinnngFee) * parseFloat(playerCount);
          let returnAmount = parseFloat(joinnngFee) - parseFloat(playerLoss);
          let bonusAmount = (parseFloat(playerLoss) / 100) * parseFloat(bonus);
          let discoutnAmount = (parseFloat(playerLoss) / 100) * parseFloat(discount);
          let returnAfterDiscount = parseFloat(returnAmount) + parseFloat(bonusAmount) + parseFloat(discoutnAmount);

          let response = {
               won: playerWon,
               loss: playerLoss,
               potValue: potValue,
               joiningFee: joinnngFee,
               platformFee: platformFee,
               returnAmount: returnAmount,
               bonusAmount: bonusAmount,
               discoutnAmount: discoutnAmount,
               returnAfterDiscount: returnAfterDiscount
          }

          return response;
     }
     calculateAmountv2(loserPoint, pointValue, playerCount, totalPoint, plaformCom, discount, bonus) {

          let joinnngFee = parseFloat(pointValue) * parseFloat(totalPoint);
          let platformFee = parseFloat(plaformCom) * (playerCount);
          let losserPointValue = (parseFloat(pointValue) - (parseFloat(pointValue) * parseFloat(platformFee) / 100))
          let playerScore = parseFloat(joinnngFee) - (parseFloat(joinnngFee) * parseFloat(platformFee)) / 100;
          let playerLoss = parseFloat(playerScore) - (parseFloat(loserPoint) * parseFloat(losserPointValue))
          let playerWon = parseFloat(joinnngFee) + (parseFloat(playerScore) - parseFloat(playerLoss));

          let potValue = parseFloat(joinnngFee) * parseFloat(playerCount);
          let returnAmount = parseFloat(joinnngFee) - parseFloat(playerLoss);
          let bonusAmount = (parseFloat(playerLoss) / 100) * parseFloat(bonus);
          let discountAmount = (parseFloat(playerLoss) / 100) * parseFloat(discount);
          let returnAfterDiscount = parseFloat(returnAmount) - parseFloat(discountAmount);

          let response = {
               won: playerWon,
               loss: playerLoss,
               potValue: potValue,
               joiningFee: joinnngFee,
               platformFee: platformFee / 10,
               returnAmount: returnAmount,
               bonusAmount: bonusAmount,
               discoutnAmount: discountAmount,
               returnAfterDiscount: returnAfterDiscount
          }

          return response;
     }
     calculateAmountv3(loserPoint, pointValue, playerCount, totalPoint, plaformCom, discount, bonus) {

          let joinnngFee = parseFloat(pointValue) * parseFloat(totalPoint);
          let losserAmountValue = parseFloat(loserPoint) * parseFloat(pointValue)
          let platformFee = parseFloat(losserAmountValue) - parseFloat(losserAmountValue) * parseFloat(plaformCom) / 100;
          let playerWon = parseFloat(joinnngFee) + (parseFloat(platformFee));
          let playerLoss = parseFloat(joinnngFee) - parseFloat(losserAmountValue);
          let potValue = parseFloat(joinnngFee) * parseFloat(playerCount);
          let returnAmount = parseFloat(playerWon);
          let bonusAmount = (parseFloat(losserAmountValue) / 100) * parseFloat(bonus);
          let discoutnAmount = (parseFloat(losserAmountValue) / 100) * parseFloat(discount);
          let returnAfterDiscount = parseFloat(returnAmount) + parseFloat(bonusAmount) + parseFloat(discoutnAmount);
          let response = {
               won: playerWon,
               loss: playerLoss,
               potValue: potValue,
               joiningFee: joinnngFee,
               platformFee: platformFee,
               returnAmount: returnAmount,
               bonusAmount: bonusAmount,
               discoutnAmount: discoutnAmount,
               returnAfterDiscount: returnAfterDiscount
          }

          return response;
     }
     
     mongoLogGameData(data) {
          const resp = {
               _id: this._id,
               capacity: this.metaData.playerCount,
               turnIndex: this.currentTurnIndex,
               state: this.gameState,
               roomId: this.roomId,
               contestId: this.contestId,
               data: data
          }

          resp.data = JSON.stringify(resp.data);
          // return JSON.stringify(resp);
          return resp;
     }

     getWinnerId() {
          // this.log('Player at winnerId', this.players);
          let winnerId = null;
          this.players.forEach((player) => {
               if (player.pState == PLAYER_STATE.WON) {
                    winnerId = player.MID
               }
          })
          return winnerId
     }

     async sendLogInMongo(evName, evData) {
          let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToLogQueue({
               evName: evName,
               roomId: this.roomId,
               evTimestamp: Date.now(),
               tableId: this.tableId,
               data: this.mongoLogGameData(evData)
          })

     }
     log(...args) {
          loggerError.Log(this._id, args);
          return
     }

     destroyTable() {
          this.log('Call destroy game', this.gameState)
          // distroyTable(this._id);
          setTimeout(distroyTable, 60000, this._id)
          if (this.xFac) {
               this.xFac.destroyOnEnd();
          }
     }
     async getMaxpoint(){
          let maxValue = 0;
          for(var i=0;i<this.players.length;i++){
               if(this.players[i].result.score>maxValue){
               maxValue = this.players[i].result.score;
              }
           }
           return maxValue;
     }
     async getLoserScoreOnExit(melds,playerIndex){
          let playerScore = 0;
          const isValidDeclaration = this.isDeclarationValid(melds)
          const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };
               melds.forEach(meld => {
                    let cards = this.cardsInfo(playerIndex, meld.cards);
                    meld.cards = cards;
                    if (!meld.cards || meld.cards?.length <= 0) {
                         this.log('Player null meld found so skipping');
                         return
                    }
                    if (meld.meldType == "Pure Sequence") {
                         this.log('Meld is PureSeq ', meld)
                         validRules.pureSeq++;
                         meld.isValid = true;
                         meld.score = 0;
                         meld.type = "pureSeq";

                    }
                    else if (meld.meldType == "Sequence") {
                         this.log('Meld is Seq ', meld)
                         if (isValidDeclaration) {
                              validRules.impureSeq++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "impureSeq";
                         }
                         else {
                              validRules.invalid++;
                              meld.score = this.calculateCardScore(cards);
                              playerScore = playerScore + meld.score;
                         }

                    }
                    else if (meld.meldType == "Set") {
                         this.log('Meld is Set ', meld)
                         if (isValidDeclaration) {
                              validRules.set++;
                              meld.isValid = true;
                              meld.score = 0;
                              meld.type = "set";
                         }
                         else {
                              validRules.invalid++;
                              meld.score = this.calculateCardScore(cards);
                              playerScore = playerScore + meld.score;
                         }

                    }
                    else {
                         // this.log('Meld is invalid ', getmeldStatus, true, false);
                         meld.score = this.calculateCardScore(cards);
                         if (meld.score != 0) {
                              validRules.invalid++;
                         }
                         playerScore = playerScore + meld.score;
                    }
               });
           return playerScore;
     }
}

module.exports = { Rummy }


// {
// 1|rummy  |   tableId: '61b090a562bd47ebdd53b186',
// 1|rummy  |   melds: '[{"meldLocation":0,"meldType":"","cards":["61b090a762bd47ebdd53b196","61b090a762bd47ebdd53b1ba","61b090a762bd47ebdd53b18b","61b090a762bd47ebdd53b1b6","61b090a762bd47ebdd53b1b8","61b090a762bd47ebdd53b1b7","61b090a762bd47ebdd53b1a9","61b090a762bd47ebdd53b18f","61b090a762bd47ebdd53b1aa","61b090a762bd47ebdd53b190","61b090a762bd47ebdd53b192","61b090a762bd47ebdd53b195","61b090a762bd47ebdd53b1bb"]},{"meldLocation":5,"meldType":"","cards":[]},{"meldLocation":1,"meldType":"","cards":[]},{"meldLocation":2,"meldType":"","cards":[]},{"meldLocation":3,"meldType":"","cards":[]},{"meldLocation":4,"meldType":"","cards":[]}]'
class BotRummy {
     constructor(tableId, players = [], emitRoom, contestId, roomId, WalletTransactionArray, metaData){
          this.Botmield;
          this.players=players;
          this.onFireEventToRoom=emitRoom;
          this.bottimer;
          this.botDicardTimer;
          this.tableId=tableId;
          this.roomId = roomId;
          this.contestId= contestId;
          



     }

    botAddCardtoMeld(melds, drawnCards) {
        for (let index = 0; index < this.Botmield.length; index++) {
             if (melds[index].meldType == "Invalid") {
                  if (this.Botmield[index].length > 0) {
                       if (this.Botmield[index][0].suit == drawnCards.suit) {

                            this.Botmield[index].push(drawnCards)
                            this.Botmield[index].sort((a, b) => a.value - b.value)
                            melds[index].cards = this.listofCardid_by_cardObject(this.Botmield[index])
                            if (this.IsRealSeq(this.Botmield[index])) {
                                 melds[index].meldType = "Pure Sequence"
                            }
                            if (this.IsSeq(this.Botmield[index])) {
                                 melds[index].meldType = "Sequence"
                            }
                            if (this.IsSet(this.Botmield[index])) {
                                 melds[index].meldType = "Set"
                            }

                       }
                       else {
                            if (this.Botmield[index].length == 0) {
                                 this.Botmield[index].push(drawnCards)
                                 this.Botmield.sort((a, b) => a.value - b.value)
                                 melds[index].cards = this.listofCardid_by_cardObject(this.Botmield[index])
                                 if (this.IsRealSeq(this.Botmield[index])) {
                                      melds[index].meldType = "Pure Sequence"
                                 }
                                 if (this.IsSeq(this.Botmield[index])) {
                                      melds[index].meldType = "Sequence"
                                 }
                                 if (this.IsSet(this.Botmield[index])) {
                                      melds[index].meldType = "Set"
                                 }
                            }

                       }
                  }



             }

             // else{
             //      if(this.Botmield[index][0].suit == drawnCards.suit){

             //           this.Botmield[index].push(drawnCards)
             //           this.Botmield.sort((a,b)=> a.value -b.value)

             //      }
             // }
        }
        this.players[this.currentTurnIndex].melds = melds;
        const response = {
             // playedBy: userId,
             _id: this.tableId,
             gameState: this.gameState,
             eventCode: "onSyncMelds",
             turnState: this.turnState,
             players: this.players
        }
        console.log("Game  Sync for bot meld response \n ", response);
        this.players(this.tableId, socketEvents.rummy.gameSync, response);

        return melds;

   }
   

    //bot action
    botSetMild(allCards = [], mode) {
        //set the meld card

        let mieldAllCard = [];
        let meldCard_clud = [];
        let meldCard_spade = [];
        let meldCard_diamond = [];
        let meldCard_heart = [];
        let meldCard_joker = [];
        let meldCardObject;
        allCards.forEach(card => {
             //set meld
             if (card.suit == 'club') {
                  meldCard_clud.push(card)
             }
             if (card.suit == 'spade') {
                  meldCard_spade.push(card)
             }
             if (card.suit == 'diamond') {
                  meldCard_diamond.push(card)
             }
             if (card.suit == 'heart') {
                  meldCard_heart.push(card)
             }
             if (card.suit == 'joker') {
                  meldCard_joker.push(card)
             }

        });
        this.Botmield = [];
        if (meldCard_clud.length > 0) {
             //sequence formation
             meldCard_clud.sort((a, b) => a.value - b.value)
             this.Botmield.push(meldCard_clud)
        }
        if (meldCard_spade.length > 0) {
             //sequence formation
             meldCard_spade.sort((a, b) => a.value - b.value)
             this.Botmield.push(meldCard_spade)
        }
        if (meldCard_diamond.length > 0) {
             //sequence formation
             meldCard_diamond.sort((a, b) => a.value - b.value)
             this.Botmield.push(meldCard_diamond)
        }
        if (meldCard_heart.length > 0) {
             //sequence formation
             meldCard_heart.sort((a, b) => a.value - b.value)
             this.Botmield.push(meldCard_heart)
        }
        if (meldCard_joker.length > 0) {
             //sequence formation
             meldCard_joker.sort((a, b) => a.value - b.value)
             this.Botmield.push(meldCard_joker)
        }
        let meldType = 'Invalid';
        let card_meld = [];
        for (let index = 0; index < 6; index++) {
             //check set sequence, pure sequence and in valid
             if (this.IsRealSeq(this.Botmield[index])) {
                  meldType = 'Pure Sequence';
             }
             if (this.IsSeq(this.Botmield[index])) {
                  meldType = 'Sequence';

             }
             if (this.Botmield[index] != undefined) {
                  this.Botmield[index].forEach(meldCard => {
                       card_meld.push(meldCard.id)
                  });
             }
             meldCardObject = {
                  meldLocation: index,
                  meldType: meldType,
                  cards: card_meld
             }
             mieldAllCard.push(meldCardObject)
             card_meld = [];

             // i++; 
        }
        //const playerIndex1 = this.currentTurnIndex;
        this.players[1].melds = mieldAllCard;
        if (mode == 2) {
             return mieldAllCard;
        }
        if (mode == 1) {
             const response = {
                  // playedBy: userId,
                  _id: this.tableId,
                  gameState: this.gameState,
                  eventCode: "onSyncMelds",
                  turnState: this.turnState,
                  players: this.players
             }
             //console.log("Game  Sync for bot meld response \n ", response);
             this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response);
             return true;
        }



   }
   listofCardid_by_cardObject(allCards) {
        let pushList = [];
        allCards.forEach(element => {
             pushList.push(element.id)
        });
        return pushList;
   }
   

    putCardBotMeld(combine) {
        let meld = this.Botmield;
        for (let index = 0; index < this.players[this.botplayerIndex].melds.length; index++) {
             if (this.players[this.botplayerIndex].melds[index].meldType == "Invalid") {
                  for (let i = 0; i < combine.length; i++) {
                       meld[index].push(combine[i]);
                       this.players[this.botplayerIndex].melds
                  }
                  break;
             }
        }

        return meld;
   }
   
    convertSequence(allCards = [], currentIndexCard) {
        let foundSequence = false;
        let combine = [];
        let sequenceSet = [[]];
        //get all the wild card from in valid cards
        let getcallMeld = [];
        if (allCards.length < 2) {
             //no need to change
             return foundSequence;
        }

        let playerBot = this.players[this.botplayerIndex].melds
        if (allCards.length >= 2) {

             playerBot.forEach(element => {
                  if (element.meldType == "Invalid") {
                       let meldlist = element.cards
                       let getcardInfo = this.cardsInfo(this.botplayerIndex, meldlist)
                       getcardInfo.forEach(card => {
                            if (card.isWildCard) {
                                 getcallMeld.push(card)
                            }
                       });
                  }
             });
             //now making the impure sequence from cards in getcallMeld
             let countSeq = 0;
             let makeSeq = 0;
             for (let i = 0; i < allCards.length; i++) {
                  if (i + 2 <= allCards.length) {
                       if (allCards[i].value + 1 == allCards[i + 1].value || allCards[i].value == allCards[i + 1].value - 2) {
                            //we found a sequence
                            sequenceSet[countSeq][makeSeq] = allCards[i]
                            sequenceSet[countSeq][makeSeq] = allCards[i + 1]
                            foundSequence = true;
                            countSeq++;
                            i += 2;
                            makeSeq = 0;
                       }
                  }
                  else {
                       if (i < allCards.length) {
                            combine.push(allCards[i])
                       }

                  }
             }
        }
        if (foundSequence) {
             for (let index = 0; index < this.players[this.botplayerIndex].melds.length; index++) {
                  if (index == currentIndexCard) {
                       for (let vi = 0; vi < sequenceSet.length; vi++) {
                            if (sequenceSet[vi].length > 0 && getcallMeld.length > 0) {
                                 //check for invalid meld
                                 //this.players[this.botplayerIndex].meld[index].meldType =  "";
                                 let getawild;
                                 for (let wildCindex = 0; wildCindex < getcallMeld.length; wildCindex++) {
                                      if (sequenceSet[vi].id != getcallMeld[wildCindex].id) {
                                           getawild = getcallMeld[wildCindex];
                                           break;
                                      }
                                 }
                                 if (getawild.id) {
                                      //remove meld from invalid meld
                                      this.Botmield = this.removeWildfromMeld(getawild)
                                 }
                                 //add meld to array
                                 sequenceSet[vi].push(getawild);
                                 this.Botmield[currentIndexCard] = sequenceSet[vi];
                                 this.players[this.botplayerIndex].melds[currentIndexCard].meldType = "Pure Sequence";
                                 this.players[this.botplayerIndex].melds[currentIndexCard].cards = this.listofCardid_by_cardObject(sequenceSet[vi]);

                                 if (combine.length > 0) {
                                      this.Botmield = this.putCardBotMeld(combine)
                                 }
                            }
                       }
                  }
             }
        }
        //we got the wildCards from deck
   }
   convertRealSequence(allCards = [], currentIndexCard) {
        let combine = [];
        let pureSequence = [[]];
        let foundPureSequence = false;
        if (allCards.length <= 2) {
             //no need to change
             return foundPureSequence;
        }
        //we know the cards always in set of suit in accending order than we have make possible pure sequence

        if (allCards.length > 2) {
             //find the pure sequence

             let countPure = 0;
             let makePure = 0;
             for (let cardindex = 0; cardindex < allCards.length; cardindex++) {

                  if (cardindex + 4 <= allCards.length) {
                       if (allCards[cardindex].value == allCards[cardindex + 1].value - 1 && allCards[cardindex + 1].value - 1 == allCards[cardindex + 2].value - 2 && allCards[cardindex + 2].value - 2 == allCards[cardindex + 3].value - 3) {

                            pureSequence[countPure][makePure] = allCards[cardindex]
                            pureSequence[countPure][makePure + 1] = allCards[cardindex + 1]
                            pureSequence[countPure][makePure + 2] = allCards[cardindex + 2]
                            pureSequence[countPure][makePure + 3] = allCards[cardindex + 3]


                            foundPureSequence = true;
                            countPure++;
                            cardindex += 4;
                            makePure = 0;
                            if (cardindex < allCards.length) {
                                 pureSequence[countPure] = []
                            }
                       }
                       if (cardindex + 3 <= allCards.length) {
                            if (allCards[cardindex].value == allCards[cardindex + 1].value - 1 && allCards[cardindex + 1].value - 1 == allCards[cardindex + 2].value - 2) {
                                 pureSequence[countPure][makePure] = allCards[cardindex]
                                 pureSequence[countPure][makePure + 1] = allCards[cardindex + 1]
                                 pureSequence[countPure][makePure + 2] = allCards[cardindex + 2]
                                 foundPureSequence = true;
                                 cardindex += 3;
                                 countPure++
                                 if (cardindex < allCards.length) {
                                      pureSequence[countPure] = []
                                 }
                            }
                       }
                       else {
                            if (cardindex < allCards.length) {
                                 combine.push(allCards[cardindex])
                            }

                       }
                  }
                  if (cardindex + 3 <= allCards.length) {
                       if (allCards[cardindex].value == allCards[cardindex + 1].value - 1 && allCards[cardindex + 1].value - 1 == allCards[cardindex + 2].value - 2) {
                            pureSequence[countPure][makePure] = allCards[cardindex]
                            pureSequence[countPure][makePure + 1] = allCards[cardindex + 1]
                            pureSequence[countPure][makePure + 2] = allCards[cardindex + 2]
                            foundPureSequence = true;
                            cardindex += 3;
                       }
                       else {
                            if (cardindex < allCards.length) {
                                 combine.push(allCards[cardindex])
                            }
                       }
                  }
                  else {
                       if (cardindex < allCards.length) {
                            combine.push(allCards[cardindex])
                       }
                  }
             }

        }
        if (!foundPureSequence) {
             for (let index = 0; index < allCards.length; index++) {
                  combine.push(allCards[index])
             }
             return foundPureSequence;
        }
        if (foundPureSequence) {
             for (let index = 0; index < this.players[this.botplayerIndex].melds.length; index++) {
                  if (index == currentIndexCard) {
                       for (let vi = 0; vi < pureSequence.length; vi++) {
                            if (pureSequence[vi].length > 0) {
                                 let lengthOfbot = this.Botmield.length;
                                 this.Botmield[lengthOfbot - vi - 1] = pureSequence[vi];
                                 console.log(this.Botmield.length - vi - 1);
                                 console.log(this.players[this.botplayerIndex].melds[lengthOfbot - vi - 1])
                                 this.players[this.botplayerIndex].melds[this.Botmield.length - vi - 1].meldType = "Pure Sequence";
                                 this.players[this.botplayerIndex].melds[this.Botmield.length - vi - 1].cards = this.listofCardid_by_cardObject(pureSequence[vi]);

                                 for (let pi = 0; pi < pureSequence[vi].length; pi++) {
                                      for (let ci = 0; ci < this.Botmield[currentIndexCard].length; ci++) {
                                           if (this.Botmield[currentIndexCard][ci] == pureSequence[vi][pi]) {
                                                this.Botmield[currentIndexCard].splice(ci, 1)
                                                this.players[this.botplayerIndex].melds[currentIndexCard].cards.splice(ci, 1)
                                           }
                                      }
                                 }
                            }


                       }
                  }
             }
        }
        let meldCardObject = this.players[this.botplayerIndex].melds;
        return meldCardObject;
   }


   
    async botPlayer(time_of_bot) {
        this.bottimer = setTimeout(async () => {
             //pick a card discussion to chosse best for pure sequence
             //this.Botmield = this.players[this.currentTurnIndex].melds.cards;
             this.Botmield = [];
             for (let cindex = 0; cindex < this.players[this.botplayerIndex].melds.length; cindex++) {
                  let type = this.players[this.botplayerIndex].melds[cindex].cards
                  console.log(type[0])
                  if (type.length > 0) {
                       if (type[0].id) {
                            let getCardIDlist = this.listofCardid_by_cardObject(this.players[this.botplayerIndex].melds[cindex].cards)
                            this.Botmield[cindex] = this.cardsInfo(this.botplayerIndex, getCardIDlist)
                       }
                       else {
                            this.Botmield[cindex] = this.cardsInfo(this.botplayerIndex, this.players[this.botplayerIndex].melds[cindex].cards)
                       }
                  }
                  else {
                       this.Botmield[cindex] = this.cardsInfo(this.botplayerIndex, this.players[this.botplayerIndex].melds[cindex].cards)
                  }


             }
             //to make pure sequence there shuold be three consiqutive with no joker or wild card
             for (let index = 0; index < this.Botmield.length; index++) {

                  if (this.IsRealSeq(this.Botmield[index]) == false && this.players[this.botplayerIndex].melds[index].meldType == "Invalid") {
                       let checkForPureSequence = this.convertRealSequence((this.Botmield[index]), index)
                       if (checkForPureSequence == false) {
                            //console.log("Bot didn't do any changes in melds")
                       }
                       else {
                            this.players[this.botplayerIndex].melds = checkForPureSequence;

                       }
                  }


             }
             for (let index = 0; index < this.Botmield.length; index++) {
                  if (this.IsSeq(this.Botmield[index]) == false && this.players[this.botplayerIndex].melds[index].meldType == "Invalid") {
                       let checkForSequence = this.convertSequence((this.Botmield[index]), index)
                       if (checkForSequence == false) {
                            //console.log("Bot didn't do any changes in melds")
                       }
                       else {
                            this.players[this.botplayerIndex].melds = checkForSequence;

                       }
                  }
             }

             //sync the melds
             const response = {
                  // playedBy: userId,
                  _id: this.tableId,
                  gameState: this.gameState,
                  eventCode: "onSyncMelds",
                  turnState: this.turnState,
                  players: this.players
             }
             //console.log("Game  Sync for bot meld response \n ", response);
             this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response);


             let reponse_draw = this.onDrawFromClosed(this.players[this.currentTurnIndex].userId)

             //console.log("Game  Sync for bot meld response \n ", reponse_draw);
             this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, reponse_draw);
             //check discard should be the card which so not effect any sequence 
             await this.botdiscards();


        }, time_of_bot);


   }
   async botdiscards() {

        //check is game is finised or not
        this.botDicardTimer = setTimeout(async () => {


             let deck_to_discards = 0;
             let meld_index = 0;
             for (let index = 0; index < this.players[this.botplayerIndex].melds.length; index++) {
                  if (this.players[this.botplayerIndex].melds[index].meldType == 'Invalid' && this.players[this.botplayerIndex].melds[index].cards.length > 0) {
                       meld_index = index;
                       deck_to_discards = 0;
                       break;
                  }
                  else {
                       if (this.players[this.botplayerIndex].melds[index].cards.length > 0) {
                            meld_index = index;
                            deck_to_discards = 0;
                       }

                  }
             }
             const validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0 };
             let playerScore = 0;
             let melds = [...this.players[this.botplayerIndex].melds];
             melds.forEach(meld => {
                  let getCardIDlist = meld.cards
                  if (meld.cards.id) {
                       getCardIDlist = this.listofCardid_by_cardObject(meld.cards)
                  }
                  let cards = this.cardsInfo(this.botplayerIndex, getCardIDlist);
                  //meld.cards = cards;
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
             this.setPlayerResult(this.botplayerIndex, playerScore, validRules, melds);
             //remove the score from meld object in bot player
             let newMeld = this.players[1].melds
             let meldsTry = []
             for (let index = 0; index < newMeld.length; index++) {
                  //remove score
                  let getlocation = newMeld[index].meldLocation
                  let getmeldType = newMeld[index].meldType
                  let getcards = this.listofCardid_by_cardObject(newMeld[index].cards)

                  meldsTry.push({
                       meldLocation: getlocation,
                       meldType: getmeldType,
                       cards: getcards
                  })
             }
             this.players[1].melds = meldsTry;
             if (this.isWinner(this.players[this.currentTurnIndex].result.rules)) {
                  this.bot_declare = true;
             }
             if (this.bot_declare) {
                  let response_finish = await this.onFinishGame(this.players[this.botplayerIndex].userId, this.players[this.currentTurnIndex].melds[meld_index].cards[deck_to_discards])
                  console.log("Game bot finish reponse \n ", response_finish);
                  this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response_finish);

                  //await this.delay(5000);

                  let response_declare = await this.onDeclareResult(this.players[this.botplayerIndex].userId, this.players[this.botplayerIndex].melds, 1)
                  console.log("Game bot declare reponse \n ", response_declare);
                  this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response_declare);
             }
             else {

                  let response_discard = await this.onDiscardCard(this.players[this.botplayerIndex].userId, this.players[this.botplayerIndex].melds[meld_index].cards[deck_to_discards])
                  console.log("Game  Sync for bot meld response \n ", response_discard);
                  this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response_discard);

             }

        }, 1000);


   }
   async botautoDeclare() {
        this.turnState = "declare";
        let getUserID = this.players.find(o => o.userId === 'bot-player-01');
        //await this.delay(5000);
        let response_declare = await this.onDeclareResult(getUserID.userId, getUserID.melds, 2)
        //console.log("Game bot declare reponse \n ", response_declare);
        this.onFireEventToRoom(this.tableId, socketEvents.rummy.gameSync, response_declare);
        this.stopTimer();
   }
   delay(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));
}

   
}
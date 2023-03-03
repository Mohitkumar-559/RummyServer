const { socketEvents } = require("../socket/events");
const loggerError = require('../../utils/logger')
const { gameService } = require("../game");
const { XFacService } = require("./xfac.service");
const { GAME_TURN_TIME_SECONDS } = require("../constants/timers");
const { customError } = require("../shared");
const intializeRabbitMQ = require("../../interfaces/rabbitMQ-server");
const intializeRummyService = require("../../interfaces/rummy-service");
const { GAME_TYPES } = require("../constants/game-type");

class XFac {
    SUITS = ['spade', 'heart', 'diamond', 'club']
    CARDS = [0, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    LEVEL = {
        EASY: 1,
        HARD: 2
    }
    level = this.LEVEL.EASY
    isResultLogged = false;
    isDeclared = false;
    gameId;
    constructor(playerIndex) {
        this.service = XFacService.Instance
        this.noOfTurns = this.randomNumber(10, 20);
    }

    async joinMatch(table, opponentId) {
        try {
            // this.level = await this.getLevel(opponentId);
            this.opponentId = opponentId
            const intializeRummyService = require("../../interfaces/rummy-service");
            let userData = await this.getUserForGame(opponentId, table)
            // userData.name += `-${this.level}`
            gameService.onSearchGame(table._id, userData);
            loggerError.Log(table?._id, 'Table state on xfac join', table, userData)
            if (table.isRunning) {
                loggerError.Log(table._id, 'Calling prestart from xfac')
                await intializeRummyService.Instance.RummyService.preStart(table, null,table?.metaData?.gameMode, this);
                return true
            }
        } catch (err) {
            loggerError.Log(table?._id || 'xfac-join', 'Error in xfac joining ', err);
        }
    }

    async getUserForGame(opponentId, table) {
        // return {
        //     _id: table._id,
        //     name: 'Naveen',
        //     userId: 'bd0276a5-c866-4e51-8a3a-039533e81905',
        //     pState: 1,
        //     DID: 'bd0276a5-c866-4e51-8a3a-039533e81905',
        //     MID: '315775',
        //     REFER_CODE: 'NAAA6A9C'
        // }
        let contestData = await intializeRabbitMQ.Instance.Transaction.getContestDetails(table.contestId.toString(), table?.metaData?.gameMode)
        // loggerError.Log(table._id, 'Game mode', contestData)
        let joiningFee;
        if(table?.metaData?.gameMode == GAME_TYPES.POINT){
            joiningFee = parseFloat(contestData.pointsvalue) * parseFloat(contestData.maxpoints);
        } else{
            joiningFee = contestData.ja
        }
        loggerError.Log(table._id, 'contest data on getUserForGame', contestData, joiningFee)
        let resp = await this.service.getUserToken(joiningFee, 0, opponentId, table._id, this.level);
        this.xFacLogId = resp.xFacLogId
        this.level = resp.xFacLevel
        this.user = await this.service.getUserData(resp.token, table._id);
        return this.user
    }

    initCardsV2(game, playerIndex, deck, jokerCard) {
        try {
            this.jokerCard = jokerCard;
            this.game = game;
            this.player = game.players[playerIndex]
            this.playerIndex = playerIndex
            this.cards = []
            this.melds = []
            this.gameId = game._id
            this.isDeclared = false;

            // if (this.level == this.LEVEL.EASY) {
            //     this.cards = deck.splice(0, 13)
            //     // game.players[1].cards = this.cards;
            //     this.sortCards(this.cards)
            // } else {
            this.melds = this.generateMelds(deck)
            this.melds.forEach((meld) => {
                meld.cards.forEach((cardId) => {
                    this.cards.push(this.game.cardsMap.get(cardId))
                })
            })
        // })

            //Syncing melds
            this.log('Sync cards on game start=>', JSON.stringify(this.melds))
            this.game.onSyncMelds(this.player.userId, JSON.stringify(this.melds))
            // }
            // Send duplicate object to avoid same refernce
            return JSON.parse(JSON.stringify(this.cards));
        } catch (err) {
            loggerError.Log(game?._id, 'Error in xfac initCardV2 ', err.toString());
        }
    }

    generateMelds(deck) {
        let total = this.level == this.LEVEL.EASY ? 4 : this.randomNumber(3, 4)
        let pureSeq = this.randomNumber(2, total)
        let seq = 0 //this.randomNumber(1, total - pureSeq)
        let set = total - pureSeq - seq
        let randomMeld = 0;
        if (this.level == this.LEVEL.EASY) {
            randomMeld = 1;
            pureSeq > 2 ? pureSeq -= 1 : set -= 1;
        }
        let meldLengths = {
            3: [4, 4, 5],
            4: [3, 3, 4, 3]
        }
        console.log(`Total=>${total}, Pure=>${pureSeq}, Seq=>${seq}, Set=>${set}`)

        let melds = []
        let meldLocation = 0;
        for (let i = 0; i < set; i++) {
            melds.push({
                "meldLocation": meldLocation,
                "meldType": 'Set',
                "cards": this.generateSet(meldLengths[total][meldLocation], deck)
            })
            meldLocation++;
        }
        for (let i = 0; i < pureSeq; i++) {
            melds.push({
                "meldLocation": meldLocation,
                "meldType": 'Pure Sequence',
                "cards": this.generatePureSeq(meldLengths[total][meldLocation], deck)
            })
            meldLocation++;
        }
        for (let i = 0; i < seq; i++) {
            melds.push({
                "meldLocation": meldLocation,
                "meldType": 'Pure Sequence',
                "cards": this.generatePureSeq(meldLengths[total][meldLocation], deck)
            })
            meldLocation++;
        }

        for (let i = 0; i < randomMeld; i++) {
            melds.push({
                "meldLocation": meldLocation,
                "meldType": 'Invalid',
                "cards": this.generateRandom(meldLengths[total][meldLocation], deck, 0)
            })
            meldLocation++;
        }


        return melds
    }

    // Currently not using this.
    initCards(game, playerIndex, deck) {
        this.game = game;
        this.player = game.players[playerIndex]
        this.playerIndex = playerIndex
        this.cards = cards;
        this.melds = [];
        this.gameState = {
            meldsCount: {
                pure: 0,
                impure: 0,
                set: 0,

            }
        }
        this.sortCards(cards)


    }

    sortCards(allCards = [], mode) {
        //set the meld card

        let mieldAllCard = [];
        let meldClub = [];
        let meldSpade = [];
        let meldDiamond = [];
        let meldHeart = [];
        let meldJoker = [];
        let meldCardObject;
        allCards.forEach(card => {
            //set meld
            if (card.suit == 'club') {
                meldClub.push(card)
            }
            if (card.suit == 'spade') {
                meldSpade.push(card)
            }
            if (card.suit == 'diamond') {
                meldDiamond.push(card)
            }
            if (card.suit == 'heart') {
                meldHeart.push(card)
            }
            if (card.suit == 'joker') {
                meldJoker.push(card)
            }

        });
        // this.Botmield = [];
        if (meldClub.length > 0) {
            //sequence formation
            meldClub.sort((a, b) => a.value - b.value)
            this.melds.push({
                meldLocation: 0,
                meldType: 'Invalid',
                cards: meldClub.map((card) => card.id)
            })

        }
        if (meldSpade.length > 0) {
            //sequence formation
            meldSpade.sort((a, b) => a.value - b.value)
            this.melds.push({
                meldLocation: 1,
                meldType: 'Invalid',
                cards: meldSpade.map((card) => card.id)
            })
        }
        if (meldDiamond.length > 0) {
            //sequence formation
            meldDiamond.sort((a, b) => a.value - b.value)
            this.melds.push({
                meldLocation: 2,
                meldType: 'Invalid',
                cards: meldDiamond.map((card) => card.id)
            })
        }
        if (meldHeart.length > 0) {
            //sequence formation
            meldHeart.sort((a, b) => a.value - b.value)
            this.melds.push({
                meldLocation: 3,
                meldType: 'Invalid',
                cards: meldHeart.map((card) => card.id)
            })
        }
        if (meldJoker.length > 0) {
            //sequence formation
            meldJoker.sort((a, b) => a.value - b.value)
            this.melds.push({
                meldLocation: 4,
                meldType: 'Invalid',
                cards: meldJoker.map((card) => card.id)
            })
        }
        this.melds.push({
            meldLocation: 5,
            meldType: 'Invalid',
            cards: []
        })
        for (let index = 0; index < this.melds.length; index++) {
            //check set sequence, pure sequence and in valid
            let meldType = 'Invalid';
            let cardStartingIndex = this.isMeldSeq(this.melds[index], true)
            if (cardStartingIndex) {
                meldType = 'Pure Sequence';
                // this.groupCards(cardStartingIndex, this.melds[index])
            }
            else if (this.isMeldSeq(this.melds[index])) {
                meldType = 'Sequence';

            } else if (this.isMeldSet(this.melds[index])) {
                meldType = 'Set';
            }
            this.melds[index].meldType = meldType
        }
        //const playerIndex1 = this.currentTurnIndex;
        // this.player.melds = this.melds
        console.log('Player melds after sorting', this.melds, allCards)
        console.log('Player melds in game ', JSON.stringify(this.game.players))

        this.game.onSyncMelds(this.player.userId, JSON.stringify(this.melds))
        // if(this.game.currentTurnIndex == this.playerIndex){
        //     this.playTurn();
        // }
        return true;




    }

    setMelds() {
        this.melds.forEach((meld) => {
            if (meld.meldType == 'Invalid' && meld.cards.length >= 3) {

            }
        })
    }

    isCardMakeSeq(card, pureOnly = false) {
        let meldIndex = null;
        for (let i = 0; i < this.melds.length; i++) {
            let currentMeld = JSON.parse(JSON.stringify(this.melds[i]))
            if (currentMeld.meldType == 'Invalid' && currentMeld.cards.length > 1) {
                let resp = this.checkMeldSyncWithGame();

                let meldCards = this.game.cardsInfo(this.playerIndex, currentMeld.cards)
                meldCards.push(card)
                meldCards.sort((a, b) => a.value - b.value)

                let count = 1
                let cIndex = 1
                let subMeld = false;
                let subMeldCards = []
                for (; cIndex < meldCards.length; cIndex++) {
                    if (meldCards[cIndex].isWildCard && pureOnly == false) {
                        count++;
                        continue;
                    }
                    // If current card value equal to prev card value+1
                    if (meldCards[cIndex].value == meldCards[cIndex - 1].value + 1) {
                        count++
                    } else {
                        count = 1
                        subMeld = GAME_TURN_TIME_SECONDS
                        subMeldCards.push(meldCards[cIndex])
                    }
                }
                this.log('Checing meld to add card or not', currentMeld.cards, card, count);
                if (count == meldCards.length) {
                    this.log('Found a meld for a card', cIndex, subMeld, subMeldCards)
                    meldIndex = i
                    // if(subMeld){
                    //     this.groupCards(subMeldCards, meldIndex)
                    // }
                    return meldIndex
                }
            }

        }
        return meldIndex
    }

    checkMeldSyncWithGame() {
        let meldCards = {};
        this.melds.forEach((meld) => {
            meld.cards.forEach((c) => {
                meldCards[c] = 1
            })
        })
        this.game.players[1].cards.forEach((card) => {
            if (!meldCards[card.id]) {
                console.log('CARD NOT SYNC')
                return
            }
        })
        console.log('CARD IS SYNCED')
        return
    }

    isCardMakeSet(card) {
        let meldIndex = null;
        for (let i = 0; i < this.melds.length; i++) {
            let currentMeld = JSON.parse(JSON.stringify(this.melds[i]))
            if (currentMeld.meldType == 'Invalid' && currentMeld.cards.length > 1) {
                let resp = this.checkMeldSyncWithGame();
                let meldCards = this.game.cardsInfo(this.playerIndex, currentMeld.cards)
                meldCards.push(card)
                meldCards.sort((a, b) => a.value - b.value)

                let count = 0
                for (let cIndex = 1; cIndex < meldCards.length; cIndex++) {
                    if (meldCards[cIndex].isWildCard) {
                        count++;
                        continue;
                    }
                    // If current card value equal to prev card value+1
                    if (meldCards[cIndex].value == meldCards[cIndex].value) {
                        count++
                    } else {
                        break
                    }
                }

                if (count == meldCards.length) {
                    meldIndex = i
                    return meldIndex
                }
            }
        }
        return meldIndex
    }

    isMeldSeq(meld, pureOnly = false) {
        console.log('Checking meld is seq or not', meld)
        let count = 1
        let cards = this.game.cardsInfo(this.playerIndex, meld.cards)
        cards.sort((a, b) => a.value - b.value)
        let cIndex = 1
        let startingIndex = null

        if (meld.cards.length < 3) {
            return null
        }
        for (; cIndex < cards.length; cIndex++) {
            if (cards[cIndex].isWildCard && pureOnly == false) {
                count++;
                continue;
            }
            // If current card value equal to prev card value+1
            if (cards[cIndex].value == cards[cIndex - 1].value + 1) {
                count++
            } else {
                break
                // startingIndex = cIndex
                // count = 1
            }
        }
        if (count >= 3) {
            return startingIndex
        }
        return null
    }

    isMeldSet(meld) {
        let isSet = false;

        let cards = this.game.cardsInfo(this.playerIndex, meld.cards)
        cards.sort((a, b) => a.value - b.value)

        let count = 0
        let cIndex = 1
        if (meld.cards.length < 3) {
            return false
        }
        for (; cIndex < cards.length; cIndex++) {
            if (cards[cIndex].isWildCard) {
                count++;
                continue;
            }
            // If current card value equal to prev card value+1
            if (cards[cIndex].value == cards[cIndex].value) {
                count++
            } else {
                break
            }
        }

        if (count == cards.length) {
            isSet = true
        }

        return isSet
    }

    addCardToMeld(card) {
        let cardAdded = false;
        let meldIndexForSeq = this.isCardMakeSeq(card);
        if (meldIndexForSeq) {
            this.melds[meldIndexForSeq].cards.push(card.id)
            cardAdded = true
        }
        else {
            let meldIndexForSet = this.isCardMakeSet(card);
            if (meldIndexForSet) {
                this.melds[meldIndexForSet].cards.push(card.id)
                cardAdded = true
            }
        }
        return cardAdded;

    }

    getCardToThrow() {
        console.log('Getting a card to throw', this.melds)
        let card;
        for (let i = 0; i < this.melds.length; i++) {
            let currentMeld = this.melds[i]
            if (currentMeld.meldType == 'Invalid' && currentMeld.cards.length > 0) {
                //desc sort
                let meldCards = this.game.cardsInfo(this.playerIndex, currentMeld.cards)
                meldCards.sort((a, b) => b.value - a.value)

                for (let c of meldCards) {
                    if (!c.isWildCard) {
                        card = c;
                        break
                    }
                }
                // card = meldCards.pop()

                // this.removeCardFromHand(card.id);
                // this.removeCardFromPlayerMelds(card.id)
                return card
            }
        }
    }


    removeCardFromHand(cardId) {
        const newHand = this.cards.filter(cardInHand => {
            return cardInHand.id != cardId
        });
        this.cards = newHand;
    }

    removeCardFromPlayerMelds(cardId) {
        let meldposition;
        let newMeld
        this.melds.forEach(meld => {
            meld.cards.forEach(cardInMeld => {
                if (cardInMeld == cardId) {
                    meldposition = meld.meldLocation
                    newMeld = meld.cards.filter(item => item !== cardId)
                }
            })
        })
        if (meldposition != undefined) {
            console.log('Melds are=>', meldposition, this.player.melds)
            this.melds.forEach(meld => {
                if (meld.meldLocation == meldposition) {
                    this.log('Setting new cards in melds=>', newMeld)
                    meld.cards = newMeld
                }
            })
        }
        return;
    }

    waitFor(min = 2, max = 5) {
        let MAX_TURN_TIME = max;
        let MIN_TURN_TIME = min;
        let waitTime = Math.ceil(Math.random() * (MAX_TURN_TIME - MIN_TURN_TIME) + MIN_TURN_TIME) * 1000;
        this.log('Wait for calculated is =>', waitTime);
        return new Promise(resolve => setTimeout(resolve, waitTime));
    }

    delay(sec) {
        return new Promise(resolve => setTimeout(resolve, sec * 1000));
    }

    async playTurn() {
        try {
            if(!this.game){
                this.log('Game obj is null on playTurn');
                return
            }
            let maxWaitFor = parseInt((this.game?.totalTurnTime/1000)/2)-1
            this.log('XFac turn come level=>', this.level)
            this.game.onSyncMelds(this.player.userId, JSON.stringify(this.melds))
            await this.waitFor(5, maxWaitFor)
            let cardOnOpenDeck = this.game.draw[0];
            this.log('Meld*Cards on playTurn=>', cardOnOpenDeck, this.melds, 'Cards=>>', this.cards)
            let canDrawFromOpen = false;
            let card;
            let meldIndexForSeq = this.isCardMakeSeq(cardOnOpenDeck);
            if (meldIndexForSeq) {
                canDrawFromOpen = true
            }

            let meldIndexForSet = this.isCardMakeSet(cardOnOpenDeck);
            if (meldIndexForSet) {
                canDrawFromOpen = true
            }

            // timeout
            let drawResp;
            if (canDrawFromOpen) {
                drawResp = this.game.onDrawFromOpen(this.player.userId)
            } else {
                drawResp = this.game.onDrawFromClosed(this.player.userId, true)
            }
            card = drawResp.card
            this.game.onFireEventToRoom(this.game.tableId, socketEvents.rummy.gameSync, drawResp);
            this.log('Meld*Cards on playTurn after draw=>', this.melds, 'Cards=>>', this.cards)
            // Timeout
            let isCardAdded = this.addCardToMeld(card)
            this.log('isCardAdded', isCardAdded, card)
            let cardToRemove;
            if (isCardAdded || card.isWildCard) {
                cardToRemove = this.getCardToThrow()
                this.log('Getted card to throw=>', cardToRemove)
                if (!cardToRemove) {
                    this.log('Unable to get a card to throw');
                    cardToRemove = card.id
                } else {
                    cardToRemove = cardToRemove.id
                    // If card is not added but still we are throwing different cards then add that card
                    if (!isCardAdded) {
                        this.addCardToPlayerHand(card)
                    }
                }
            } else {
                // this.removeCardFromHand(card.id)
                // this.removeCardFromPlayerMelds(card.id)
                cardToRemove = card.id
            }
            await this.waitFor(5, maxWaitFor)
            if (this.canDeclare()) {
                let resp = await this.game.onFinishGame(this.player.userId, cardToRemove);
                this.game.onFireEventToRoom(this.game.tableId, socketEvents.rummy.gameSync, resp);
                await this.delay(2);
                resp = await this.game.onDeclareResultV2(this.player.userId, JSON.stringify(this.melds), 'XFAC-DECLARE')
                this.isDeclared = true;
                this.game.onFireEventToRoom(this.game.tableId, socketEvents.rummy.gameSync, resp);
            } else {
                let resp = await this.game.onDiscardCard(this.player.userId, cardToRemove);
                this.game.onFireEventToRoom(this.game.tableId, socketEvents.rummy.gameSync, resp);
            }

            this.removeCardFromHand(cardToRemove)
            this.removeCardFromPlayerMelds(cardToRemove)
            return

        } catch (err) {
            console.error('Error come in playTurn=>', err, this.gameId);
            this.log('Error come in playTurn', err.toString())
            return
        }
    }

    // getCardFromOpenDeck(index = 0){
    //     this.log('getCardFromDeck called', index, this.game.draw.length);
    //     let cardOnOpenDeck = this.game.draw[index];
    //     if(cardOnOpenDeck.isWildCard){
    //         return this.getCardFromOpenDeck(index+1)
    //     }
    //     return cardOnOpenDeck
    // }

    addCardToPlayerHand(card) {
        // check length of hand 
        // add to player hand and update the state. // update deck and player
        if ((this.cards.length) <= 13) {
            this.cards.push(card);
            this.melds[this.melds.length - 1].cards.push(card.id)
            this.melds[this.melds.length - 1].meldType = this.getMeldType(this.melds[this.melds.length - 1])
        }
        else {
            throw customError.createCustomError(400, "Player cards+melds > 13 xfac", this.gameId);
        }
    }

    getOpponentScore() {
        let opponentIndex = 0;
        let melds = JSON.parse(JSON.stringify(this.game.players[opponentIndex].melds))
        const isValidDeclaration = this.game.isDeclarationValid(melds)
        let validRules = { pureSeq: 0, impureSeq: 0, set: 0, invalid: 0, playerScore: 0, meldPresent: false };
        melds.forEach(meld => {
            let cards = this.game.cardsInfo(opponentIndex, meld.cards);
            meld.cards = cards;
            validRules.meldPresent = true
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
                    meld.score = this.game.calculateCardScore(cards);
                    validRules.playerScore = validRules.playerScore + meld.score;
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
                    meld.score = this.game.calculateCardScore(cards);
                    validRules.playerScore = validRules.playerScore + meld.score;
                }

            }
            else {
                // this.log('Meld is invalid ', getmeldStatus, true, false);
                meld.score = this.game.calculateCardScore(cards);
                if (meld.score != 0) {
                    validRules.invalid++;
                }
                validRules.playerScore = validRules.playerScore + meld.score;
            }
        });
        this.log('Opponent score is=>', validRules);
        return validRules
    }

    groupCards(startingCardIndex, parentMeld) {
        if (startingCardIndex == 0) {

        }
        cards.forEach((cardId) => {
            parentMeld.cards.splice(cardId)
        })
        let cardAdded = false;
        this.melds.forEach((meld) => {
            if (meld.cards.length == 0) {
                meld.cards.push(...cards)
                meld.meldType = this.getMeldType(meld)
                cardAdded = true
            }
        })

        if (!cardAdded) {
            // Create new meld
            let newMeld = {
                meldLocation: 7,
                meldType: 'Invalid',
                cards: cards
            }
            newMeld.meldType = this.getMeldType(newMeld);
        }

        return true
    }

    getMeldType(meld) {
        let meldType = 'Invalid';
        if (this.isMeldSeq(meld, true)) {
            meldType = 'Pure Sequence';
        }
        else if (this.isMeldSeq(meld)) {
            meldType = 'Sequence';

        } else if (this.isMeldSet(meld)) {
            meldType = 'Set';
        }
        return meldType
    }

    generatePureSeq(len, deck) {
        let deckNo = this.randomNumber(1, 2);
        let suit = this.SUITS[this.randomNumber(0, 3)]
        let startFrom = this.randomNumber(1, this.CARDS.length - len)
        let seqCards = []
        let seqFound = true;
        for (let i = 0; i < len; i++) {
            let cId = `${deckNo}-${suit}-${this.CARDS[startFrom]}`
            startFrom++;
            if (!this.existInDeck(cId, deck)) {
                seqFound = false
                break
            }
            seqCards.push(cId)
        }
        if (!seqFound) {
            return this.generatePureSeq(len, deck)
        } else {
            seqCards.forEach((cId) => {
                this.popFromDeck(cId, deck)
                // deck.splice(deck.indexOf(cId), 1);
            })
        }

        console.log(deck.length, '++++', seqCards)
        return seqCards

    }

    generateSet(len, deck) {
        let deckNo = this.randomNumber(1, 2);
        let setCard = this.randomNumber(1, this.CARDS.length)
        let setCards = []
        let setFound = true;
        this.log('Generating SET for xfac', this.CARDS[setCard], this.jokerCard);
        for (let i = 0; i < len; i++) {
            let cId = `${deckNo}-${this.SUITS[i]}-${this.CARDS[setCard]}`
            if (!this.existInDeck(cId, deck)) {
                setFound = false
                break
            } else if(this.CARDS[setCard] == this.jokerCard?.rank){
                setFound = false
                break
            }
            setCards.push(cId)
        }
        if (!setFound) {
            return this.generateSet(len, deck)
        } else {
            setCards.forEach((cId) => {
                this.popFromDeck(cId, deck)
                // deck.splice(deck.indexOf(cId), 1);
            })
        }

        console.log(deck.length, '++++', setCards)
        return setCards

    }

    generateRandom(len, deck, score) {
        let randomCards = []
        let cardFound = true;
        for (let i = 0; i < len; i++) {
            let suit = this.SUITS[this.randomNumber(0, 3)]
            let deckNo = this.randomNumber(1, 2);
            let card = this.randomNumber(1, this.CARDS.length)
            let cId = `${deckNo}-${suit}-${this.CARDS[card]}`
            if (!this.existInDeck(cId, deck) || this.isJoker(cId, deck)) {
                cardFound = false
                break
            }
            randomCards.push(cId)
        }
        if (!cardFound) {
            return this.generateRandom(len, deck, score)
        } else {
            randomCards.forEach((cId) => {
                this.popFromDeck(cId, deck)
                // deck.splice(deck.indexOf(cId), 1);
            })
        }

        console.log(deck.length, '++++', randomCards)
        return randomCards

    }

    isJoker(cardId, deck) {
        let selectedCard;
        for (let card of deck) {
            if (cardId == card.id) {
                selectedCard = card
            }
        }
        if (selectedCard && selectedCard.isWildCard) {
            return true
        }
        return false
    }

    randomNumber(min, max) {
        if (min > max) {
            return 0
        }
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    existInDeck(cardId, deck) {
        for (let card of deck) {
            if (cardId == card.id) {
                return true
            }
        }
        return false
    }

    isJoker(cardId, deck){
        let selectedCard;
        for (let card of deck) {
            if (cardId == card.id) {
                selectedCard = card
            }
        }
        if(selectedCard && selectedCard.isWildCard){
            return true
        }
        return false
    }

    popFromDeck(cardId, deck) {
        for (let i = 0; i < deck.length; i++) {
            if (cardId == deck[i].id) {
                deck.splice(i, 1);
                return true
            }
        }
        return false
    }

    async getLevel(opponentId) {
        // return this.LEVEL.HARD;
        let randomNo = this.randomNumber(0, 1);
        return randomNo == 0 ? this.LEVEL.EASY : this.LEVEL.HARD
    }

    canDeclare() {
        this.log('caDeclare=>', this.noOfTurns, this.game?.turnCount)
        let canDeclare = false;
        if(this.isDeclared){
            return
        }
        if (this.level == this.LEVEL.HARD) {
            let opponentScore = this.getOpponentScore()
            if (this.game.turnCount >= this.noOfTurns || (opponentScore?.invalid <= 1 && opponentScore.meldPresent)) {
                canDeclare = true
            }
        } else {
            canDeclare = false
        }
        return canDeclare
    }

    async destroyOnEnd() {
        this.log('Called destroy xfac data on game end', this.game.getWinnerId())
        if (!this.isResultLogged) {
            let winnerId = this.game.getWinnerId();
            let result = winnerId.toString() == this.user.MID.toString() ? false : true
            let logData = {
                UserId: this.opponentId,
                XFacId: this.user.MID,
                XFacLevel: this.level,
                RoomId: this.game.roomId,
                Result: result,
                ContestId: this.game?.contestId ? parseInt(this.game.contestId) : null,
                xFacLogId: this.xFacLogId
            }
            this.log('Send xfac logs', logData, winnerId, this.user.MID)
            await this.service.saveXFacGameLog(logData)
            this.isResultLogged = true
            await this.freeSelf();
        }
        this.game = null;
        this.user = null;
        return;
    }

    async freeSelf() {
        await this.service.freeXfacUSer(this.user.MID)
    }

    onOpponentExit() {
        this.log('Opponent exit changing card for xfac', this.level, this.game.deck.length)
        if (this.game.deck.length < 14) {
            return
        } else {
            this.cards = this.game.deck.splice(0, 13)
            this.game.players[1].cards = this.cards;
            this.melds = []
            this.sortCards(this.cards)
        }
    }

    async onOpponentDeclare(userId){
        try{
            this.log('Opponent declare', this.level, this.game.deck.length, userId, this.user.DID, this.isDeclared)
            if(userId.toString().toLowerCase() == this.user.DID.toString().toLowerCase() || this.isDeclared){
                this.log('Seld declare')
                return
            }
            await this.delay(10);
            let resp = await this.game.onDeclareResultV2(this.player.userId, JSON.stringify(this.melds), 'XFAC-DECLARE')
            this.isDeclared = true
            this.game.onFireEventToRoom(this.game.tableId, socketEvents.rummy.gameSync, resp);
        }catch(err){
            console.error('Error come in xfac declare=>', err, this.gameId);
            this.log('Error come in declare', err.toString())
            return
        }
    }


    log(...args) {
        if (this.game) {
            loggerError.Log(this.game?.tableId, args)
        } else {
            console.error('Error in xfac logging', args, this.gameId)
        }
    }

}

module.exports = { XFac }
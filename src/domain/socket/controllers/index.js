module.exports = {
     tableInitController : require("./table-init"),
     drawCardController : require("./draw-card"),
     discardController : require("./discard-card"),
     finishGameController : require("./finish-game"),
     declareResult : require("./declare-result"),
     exitGameController : require("./exit-game"),
     syncGameController : require("./game-sync"),
     syncMeldsController : require("./sync-melds"),
     joinContestController : require("./join-contest"),
     initializeController : require("./intialize-socket"),
     gameStartController : require("./gamestart-socket"),
     gameEntryController: require("./gameEntry-socket"),
     appDisconnect: require("./app-disconnect")
}
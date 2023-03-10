exports.socketEvents = {
     default: {
          connection: "connection",
          connect_error: "connect_error",
          connect_timeout: "connect_timeout",
          error: "error",
          disconnect: "disconnect",
          reconnect: "reconnect",
          reconnect_error: "reconnect_error",
          pong: "pong"
     },
     matchMaking: {
          tableInit: "tableInit",
          JoinStart: "joinGame",
          Intialize: "intialize",
          GameStart: "gameStart"
     },
     

     rummy: {
          "gameSync": "gameSync",
          "drawCard" : "drawCard",
          "finish": "finish",
          "declare": "declare",
          "exitGame" : "exitGame", 
          "syncMelds": "syncMelds",
          "onGameEntry": "onGameEntry",
          "appDisconnect":"appDisconnect",
          start : "start",
          syncGameCards: "",
          getGameState : "gameState",
          getHandCards : "getHandCards",
          pickupStock : "pickupStockCard",
          pickupDiscard : "pickupDiscard",
          playCards : "playCards",
          discardCard : "discardCard",
          showCards : "showCards"
     }
}

// pick_up_stock
// pick_up_discard
// play_cards
// discard
// call_rummy



// message PlayerState {
//      int32 id = 1;
//      string name = 2;
//      repeated Meld melds = 3;
//      repeated deck.Card rummies = 4;
//      int32 num_cards_in_hand = 5;
//      int32 current_score = 6;
//  }
 
//  message GameState {
//      enum TurnState {
//          TURN_START = 0;
//          PICKED_UP_CARDS = 1;
//          PLAYED_CARDS = 2;
//      }
 
//      int32 num_cards_in_stock = 1;
//      repeated deck.Card discard_pile = 2;
//      repeated Meld aggregated_melds = 3;
//      repeated PlayerState players = 4;
//      int32 turn = 6;
//      int32 current_player_turn = 7;
//      TurnState turn_state = 8;
//      bool game_over = 9;
//  }
 
//  message GameEvent {
//      enum Type {
//          UNKNOWN_TYPE = 0;
//          CUT 
//          DEALING :  
//          TURN_START = 1;
//          PICK_UP_STOCK = 2;
//          PICK_UP_DISCARD = 3;
//          PLAY_CARDS = 4;
//          DISCARD = 5;
//          GAME_OVER = 6;
//      }
 
//      int32 player_id = 1;
//      Type type = 2;
//      repeated deck.Card cards = 3;
//      int32 score = 4;
//  }
"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
let userSchema = new Schema({
     metaData: {
          gameType: { type: Number },
          roomMode: { type: Number },
          serverVersion: { type: Number },
          playerCount: { type: Number },
          betValue: { type: Number }
     },
     players: [
          {
               name: { type: String },
               userId: { type: String },
               pState: { type: String }
          }
     ],
     gameState: { type: Number },
     processId: { type: String },
     turnNo: { type: Number },
     gameState: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);
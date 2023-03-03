"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
let history = new Schema({
     userId : {type:String},
     gameId : {type:Number},
     deduction : {type:Number},
     status : {type:Number},
}, { timestamps: true });

module.exports = mongoose.model("history", history);
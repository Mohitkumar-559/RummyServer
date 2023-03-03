"use strict";
//const mongoose = require("mongoose");
const mongoose = require("../../infra/Mongo/mongo-conn")
const Schema = mongoose.Schema;
let templateSchema = new Schema({
     templateid :{type:Number},
     catid : {type:Number},
     templatename : {type:String},
     noofdecks : {type:Number},
     noofplayers : {type:Number},
     pointsvalue : {type:String},
     round : {type:Number},
     discountpercent : {type:String},
     bonuspercent : {type:String},
     maxpoints : {type:Number},
     ismultipletableallowed : {type:Boolean},
     isactive : {type:Boolean},
     commisionpercent : {type:String},
     delaytime : {type:Number},
     starttime : {type:Number},
     waitingtime : {type:Number},
     Duration : {type : Number}
}, { timestamps: true });


module.exports = mongoose.model("templates", templateSchema);
"use strict";
const lobbyConfigModel = require("./lobby.model");
const historyModel = require("./transaction.model");
const UserService = require('./user.service');
const contestDetails = require("./contest.details")


exports.getLobbyConfig = async(contestId)=>{
    const resp = await lobbyConfigModel.findOne({templateid:contestId});
    return resp;
}
exports.getAllLobbyConfig = async()=>{
    const resp = await lobbyConfigModel.find({isactive:true});
    return resp;
}

exports.getContestDetailsByid = async(contestId)=>{
    const resp = await contestDetails.getContestById(contestId)
    return resp;
}

exports.joinGame = async(req)=>{
    let userServices = new UserService();
    const resp = await userServices.joinGames(req.body.profile, req.body.ticket);
    return resp;
}

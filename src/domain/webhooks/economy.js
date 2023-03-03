"use strict";
const util = require("util");
const needle = require("needle");
const getBalanceURI = "http://callback.oneto11.com/api/Transaction/GetPlayerBalance";
const deductPlayerBalanceURI = "http://callback.oneto11.com/api/Transaction/DeductPlayerBalance";
const getUserProfileURI = "http://callback.oneto11.com/api/Profile/GetUserProfile";
const addPlayerBalanceURI = "https://callback.oneto11.com/api/Transaction/AddPlayerBalance";

const postReq = util.promisify(needle.post).bind(needle);

exports.getPlayerBalance = async (userId) => {
     const body = { "UserId": userId, "UserLoginId": 1, txid: Date.now() };
     const result = await postReq(getBalanceURI, body, { json: true });
     //console.info("playerBalance ", result.statusCode);
     //console.info("playerBalance ", result.body);
     return result.body;
}
exports.deductPlayerBalance = async (token, amount = 1, gameId = 1,bonusAmt) => {
     var options = {
          headers: { 
               "Authorization": "Bearer "+token,
          },
          json: true
        }
     const body = {
          "MatchId": 1,
          "ContestId": 1||gameId, // tmp fix
          "Amount": amount,
          "GameId": 5,// rummy
          "MaxBonusAllowed": bonusAmt,
     };
     const result = await postReq(deductPlayerBalanceURI, body, options);
     ////console.info("deductPlayerBalance code ", result.statusCode);
     ////console.info("deductPlayerBalance ", result.body);
     return result.body;
}
exports.getPlayerBalance = async (userIds="13,14,15") => {
     const body = {
          "UsersId": userIds,
          "txid": Date.now()
     };
     const result = await postReq(getUserProfileURI, body, { json: true });
     ////console.info("playerBalance ", result.statusCode);
     ////console.info("playerBalance ", result.body);
     return result.body;
}

exports.addPlayerBalance = async (token, amount = 1, gameId = 1,TransferType, templateId) => {
     var options = {
          headers: { 
               "Authorization": "Bearer "+token,
          },
          json: true
        }
     const body = {
          "TransferType": TransferType,
          "RoomId":1 || gameId,
          "ContestId":templateId,
          "Amount":amount
        }
     const result = await postReq(addPlayerBalanceURI, body, options);
     ////console.info("deductPlayerBalance code ", result.statusCode);
     ////console.info("deductPlayerBalance ", result.body);
     return result.body;
}
// module.exports.playerBalance("81dce16d-042a-4323-8e30-6e1102e3d1c2");
// module.exports.getPlayerBalance();

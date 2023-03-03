"use strict";
let matchMakingKeys = {};
const processId = 1;
const serverVersion = 1;
const envName = "dev"
function getSlotWise(userId) {
     return "{" + userId + "}";
}
function generateKey() {
     return Array.prototype.slice.call(arguments).join(":");
}
matchMakingKeys.userHashKey = (userId) => {
     return generateKey(getSlotWise(userId), "USER", envName);
}

matchMakingKeys.onlinePlayerCountHashKey = () => {
     return generateKey(getSlotWise("PLAYER"), "COUNT", envName);
}
// pipelining on processId
matchMakingKeys.gameHashKey = (gameId) => {
     return generateKey(getSlotWise(processId), gameId, "GAME", envName);
}
// pipelining on processId
matchMakingKeys.waitingMatchSet = function (waitingGameTypeString) {
     return generateKey(getSlotWise(processId), waitingGameTypeString, envName, serverVersion);
}
matchMakingKeys.runningGameSet = function (runningGameTypeString) {
     return generateKey(getSlotWise(runningGameTypeString), serverVersion, processId, envName, "RUNNING");
}

matchMakingKeys.runningMatchCountHash = function () {
     return generate_redis_key(getSlotWise("LOBBY"), "PLAYERS", envName);
}



matchMakingKeys.getSlotWise = getSlotWise;
matchMakingKeys.generateKey = generateKey;

module.exports = matchMakingKeys;
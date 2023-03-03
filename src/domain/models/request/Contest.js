const RequestAuthentication = require("./RequestAuthentication");

module.exports.GetContestRequest = class GetContestRequest extends RequestAuthentication{
    gameId;
}

module.exports.GetContestRequest = class ContestPrizeBreakUpRequest extends RequestAuthentication{
    contestId;
    gameId;
}
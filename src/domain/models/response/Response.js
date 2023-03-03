class ContestResponse{
    categorisation=[];
    match_contest=[];
}

class JoinContestResponse{
    ResponseStatus;
    RoomId;
}

class PrizeBreakupResponse{
    contest =[];
    breakup =[]
}

class JoinedContest{
    contest_id;
    tc;
}

class AppGameSetting{
    i;
    appgametypeid;
    gametypename;
    appgamestatusid;
    img;
    SortOrder;
    IsActive;
}
module.exports={
    AppGameSetting,
    JoinedContest,
    PrizeBreakupResponse,
    JoinContestResponse,
    ContestResponse
}
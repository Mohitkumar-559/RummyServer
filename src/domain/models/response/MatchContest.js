class MatchContestDetails
{
    cid;
    cn;
    fw;
    wa;
    ba;
    tt;
    cic;
    mea;
    mate;
    total_joined;
    cc;
    total_winners;
    mp;
    ja;
    catid;
    IsConfirm;
    isPrivate;
    currentDate;
    mba;
    jf;
    Duration;
    GameStartInSeconds;
    GameDelayInSeconds;
    TotalTimeInSeconds;
    IsStart;
    SortOrder;
    contest_msg;
    StartTime;
    WaitingTime;
    DelayTime;
    StartTimeDateTime;

    constructor(){
        
    }
}

class Category
{
    catid;
    cn;
    cm;
    tc;
    isprac;
}

class PracticeContestUser{
    ContestId;
}

class Breakup{
    wf;
    wt;
    wa;
}

class CompletedContestResponse{
    ContestId;
    RoomId;
    GameTypeId;
    ContestName;
    JoinedFee;
    PricePool;
    ContestDate;
    WinningPrice;
    Status;
    Score;
    StatusId;
    IsResultDeclared;
    IsWin;
    IsRefunded;
    IsCashback;
}

class PlayerDetails{
    PlayerId;
    ReferCode;
    Rank;
    Points;
    WinningAmount;
    IsWiningZone;
    IsPrizeAdded;
    ContestId;
    GameId;
}

class GetRoomDetailsResponse{
    ContestId;
    ContestName;
    Joiningfees;
    WinningPrize;
    Players=[];
}

module.exports={
    MatchContestDetails,
    GetRoomDetailsResponse,
    PlayerDetails,
    CompletedContestResponse,
    Breakup,
    PracticeContestUser,
    Category
}
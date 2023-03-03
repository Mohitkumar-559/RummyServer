class TransactionTokenRequest{
    cid;
    amt;
    mba;
    gameserverid;
    userList= [];    
}

class ContestWinnerRequest{
    RoomId;
    ContestId;
    ludoParticipantScore=[];
}

module.exports={
    TransactionTokenRequest,
    ContestWinnerRequest
}
const SqlDB = require( "../Sql-interface");
export class GetMatches{
    uow;
    constructor(UOW){
        this.uow =  UOW;
    }

    async SaveContestCategorisationInCache(gameId){
        const proc_name = "PROC_GET_ContestCategorisation";
        const param = "@GameId=" + gameId;
        var result = await this.uow.GetDataFromCasualGame(proc_name, param);
        return result;
    }

    async SaveAppGameSettingInCache(){
        const proc_name = "PROC_GET_AppGameSetting";
        const param = "";
        var result = await this.uow.GetDataFromCasualGame(proc_name, param);
        return result
    }
}
const SqlDB = require("../../infra/Sql/Sql-interface");
const needle = require('needle');
const loggerError = require('../../utils/logger')

const {
    authenticateToken
} = require("../socket/middlewares/authentication");

class XFacService {
    _instance;
    constructor() {
        this.uow = SqlDB.Instance
    }

    static get Instance() {
        if (!this._instance) {
            this._instance = new XFacService();
        }
        return this._instance
    }

    async getUserToken(amount, mba, opponentId, gameId, level) {
        try {
            loggerError.Log(gameId, 'req for xfac token', amount, mba)
            console.log(gameId, 'req for xfac token', amount, mba)
            const proc_contest_name = "PROC_GetRummyUserForXFacPlay"
            let param_contest = `@Amount=${amount}, @BonusApplicable=${mba}, @UserId=${opponentId}, @RequestFrom='${gameId}', @XFacLevel=${level}`;
            let resp = await this.uow.GetDataFromTransaction(proc_contest_name, param_contest);
            loggerError.Log(gameId, 'result from get user sp', resp, param_contest);
            console.log(gameId, 'result from get user sp', resp);
            if (resp && resp.length > 0) {
                if (resp[0].ResponseStatus != 1) {
                    loggerError.Log('Response status 0 in getUser SP', resp);
                    throw new Error("Unable to get xfac for user");
                }
                let token = await this.getToken(resp[0].UserId, gameId)
                return {
                    token: token,
                    xFacLevel: resp[0].XFacLevel,
                    xFacLogId: resp[0].XFacLogId
                }
            }
            throw new Error("Unable to fetch data from PROC_GetUserForXFacPlay_V2")
        } catch (err) {
            console.log('Error in get xfac user', err);
            throw err
        }
    }

    async getUserData(token, tableId) {
        let userData = authenticateToken(token);
        userData._id = tableId
        userData.pState = 1
        return userData
    }

    async getToken(userId, gameId = 'default') {
        let reqUrl = `${process.env.XFAC_TOKEN_URL}?UserId=${userId}`
        let resp = await needle('get', reqUrl);
        // console.log(resp)
        loggerError.Log(gameId,  'token api resp', resp.body)
        console.log(gameId, 'token api resp', resp.body)
        if (resp.statusCode == 200) {
            return resp.body.access_token
        }
        throw new Error('Unable to get data from token API')
    }

    async saveXFacGameLog(data) {
        try {
            const proc_contest_name = "PROC_CreateRummyXFacGameLog"
            let param_contest = `@UserId=${data.UserId}, @XFacId=${data.XFacId}, @XFacLevel=${data.XFacLevel}, @Result=${data.Result}, @RoomId=${data.RoomId}, @ContestId=${data.ContestId}, @XFacLogId=${data.xFacLogId}`;
            let resp = await this.uow.GetDataFromTransaction(proc_contest_name, param_contest);
        } catch (err) {
            console.log('Error in get xfac user', err);
            throw err
        }
    }

    async freeXfacUSer(userMid, gameId){
        try {
            const proc_contest_name = "PROC_UPDATE_LUDO_XFac_USER_STATUS"
            let param_contest = `@UserId=${userMid}`;
            loggerError.Log(gameId, 'Freeing xfac user ');
            let resp = await this.uow.GetDataFromTransaction(proc_contest_name, param_contest);
            loggerError.Log(gameId, 'Freeing xfac user resp ', resp);
            // if (resp && resp.length > 0) {
            //     if(resp[0].ResponseStatus != 1){
            //         throw new Error("Unable to free xfac for user");
            //     }
            //     return 
            // }
            // throw new Error("Unable to free xfac from PROC_UPDATE_LUDO_XFac_USER_STATUS")
        } catch (err) {
            loggerError.Log(gameId, 'Error in Freeing xfac user ', err.toString());
            console.log('Error in free xfac user', err);
            throw err
        }
    }
}

module.exports = { XFacService }
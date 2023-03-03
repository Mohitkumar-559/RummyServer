const {rummyService} = require("../domain/user/rummy.service")
module.exports = class intializeRummyService {
    _rummyService;
    static _instance;
    constructor(){
        this._rummyService = new rummyService();
        
    }
    static get Instance() { 
        if (!this._instance) {
            this._instance = new intializeRummyService()
        }
        return this._instance;
    }
    get RummyService(){
        return this._rummyService;
    }
}

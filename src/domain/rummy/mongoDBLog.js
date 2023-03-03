function mongoLogGameData(data) {
    const resp = {
        _id: this._id,
        capacity: this.capacity,
        isFull: this.noofplayers,
        turnIndex: this.turnIndex,
        state: this.gameState,
        roomId: this.roomId,
        contestId: this.contestId,
        data: data
    }
    
    resp.data = JSON.stringify(resp.data);
    // return JSON.stringify(resp);
    return resp;
}

async function  sendLogInMongo(evName,evData) {
    let ack = await intializeRabbitMQ.Instance.RabbitMQ.pushToLogQueue({
        evName: evName,
        roomId: this.roomId,
        evTimestamp: Date.now(),
        data: this.mongoLogGameData(evData)
    })
    
}
module.exports={
    sendLogInMongo
};
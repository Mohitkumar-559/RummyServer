"use strict";

const { ERROR_CODES, DEVICE_TYPES } = require("../../constants");
// const { DEVICE_TYPE } = require("../constants/device-type");
const { customError } = require("../../shared");
const { jwtAuth } = require("../../webhooks");
exports.authenticateSocketConnection = async (socket, socketCallback) => {
     try {
          const { token, appVersion, deviceType, serverVersion } = validateSocketConnection(socket, socketCallback);
          const tokenData = jwtAuth.verifyJwtToken(token);
          socket.userId = tokenData.userId;
          socket.name = tokenData.name;
          socket.mid = tokenData.mid;
          socket.token = token;
          socket.mid = tokenData.mid
          // verify token, getUser profile, validate price 
          console.info("authenticateSocketConnection: tokenData ", tokenData);
          return socketCallback();
     } catch (error) {
          console.error("authenticateSocketConnection", error);
          socketCallback(error);
     }

}

exports.authenticateToken = (token)=>{
     try {
          const tokenData = jwtAuth.verifyJwtToken(token);
          let userData = {
               name: tokenData.name,
               userId: tokenData.userId,
               DID: tokenData.userId,
               MID: tokenData.mid,
               REFER_CODE: tokenData.rc
          }
          // verify token, getUser profile, validate price 
          return userData
     } catch (error) {
          console.error("authenticateSocketConnection", error);
     }
}
exports.authenticateSocketConnection_ = async (request) => {
     try {
          let gettoken = request.rawHeaders;
         
          let token = gettoken[5];
          //  let split = gettoken[1].split(" ")
          // let token = split[1];
          const tokenData = jwtAuth.verifyJwtToken(token);
          // verify token, getUser profile, validate price 
          let user={}
          user = tokenData
          console.info("authenticateSocketConnection: tokenData ", user);
          return user;
     } catch (error) {
          console.error("authenticateSocketConnection", error);
          return error;
     }

}
const validateSocketConnection = (socket, socketCallback) => {
     if (typeof socketCallback != "function") {
          socketCallback = () => { };
     }
     const token = socket.handshake.query.token || "";
     const appVersion = socket.handshake.query.appVersion || "";
     const deviceType = parseInt(socket.handshake.query.deviceType) || "";
     const serverVersion = socket.handshake.query.serverVersion || "";
     //console.info("validateSocketConnection: body ", socket.handshake.query);
     let err = false;
     if (!token) err = true;
     else if (!serverVersion) err = "Server version";
     else if (!appVersion) err = "App version";
     else if (!deviceType) err = "device Type";
     else if (![DEVICE_TYPES.IOS, DEVICE_TYPES.ANDROID].includes(deviceType)) {
          err = "Invalid device";
     }
     if (err) {
          throw customError.createCustomError(ERROR_CODES.INVALID_SOCKET_CONNECTION_PARAMS, err);
     }
     return { token, appVersion, deviceType, serverVersion };
}

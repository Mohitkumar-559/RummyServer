"use strict";
const fs = require("fs");
const privateKey = fs.readFileSync(__dirname + '/certs/jwt-token.pem');
const jwt = require("jsonwebtoken");

exports.verifyJwtToken = (token) => {
     console.info("verifyJwtToken 1", token);
     const tokenData = jwt.verify(token, privateKey, { algorithms: ['RS256'] });
     console.info("verifyJwtToken 2", tokenData);
     return {
          userId: tokenData.sub,
          name: tokenData.FullName,
          rc: tokenData.rc,
          mid: tokenData.mid
     }
}
exports.verifyJwtToken2 = (token) => {
     console.info("verifyJwtToken 1", token);
     const tokenData = jwt.verify(token, privateKey, { algorithms: ['RS256'] });
     console.info("verifyJwtToken 2", tokenData);
     return {
          _id: tokenData.sub,
          userId: tokenData.sub,
          name: tokenData.FullName,
          mid:tokenData.mid,
          token:token

     }
}
const payload = {
     "iss": "https://account.oneto11.com",
     "aud": [
          "https://account.oneto11.com/resources",
          "authentication"
     ],
     "client_id": "Auth",
     "sub": "81dce16d-042a-4323-8e30-6e1102e3d1c2",
     "idp": "local",
     "FullName": "Ratna deep ",
     "mid": "13",
     "rc": "RAAA2223",
     "scope": [
          "authentication.full_access",
          "offline_access"
     ],
     "amr": [
          "mobile"
     ]
}
exports.createJwtToken = (payload) => {
     const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
     console.log("createJwtToken \n ", token);
     return token;
}
module.exports.createJwtToken(payload);
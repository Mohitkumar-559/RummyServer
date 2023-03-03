"use strict";
const Joi = require("joi");
const { ERROR_CODES } = require("../../constants");
const { createCustomError } = require("../../shared/custom-error");
exports.onTableInitSchema = (body) => {
     const schema = Joi.object({
          //gameType: Joi.number().required(),
          //roomMode: Joi.number().required(),
          //serverVersion: Joi.number().required(),
          //playerCount: Joi.number().required(),
          //betValue: Joi.number().required(),
          contestId :  Joi.string(),
          gameId : Joi.string().required(),
     });
     const options = {
          abortEarly: false, // include all errors
          allowUnknown: true, // ignore unknown props
          stripUnknown: true // remove unknown props
     }
     const { error, value } = schema.validate(body, options);
     if (error) throw createCustomError(ERROR_CODES.INVALID_TABLE_INIT_PARAMS, error.details.map(x => x.message).join(", "));
     return value;
}
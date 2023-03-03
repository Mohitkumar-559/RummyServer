"use strict";
const Joi = require("joi");
const { ERROR_CODES } = require("../constants");
const { createCustomError } = require("../shared/custom-error");
exports.gameSchema = (body) => {
     const schema = Joi.object({
          metaData: {
               gameType: Joi.number().required(),
               roomMode: Joi.number().required(),
               serverVersion: Joi.number().required(),
               playerCount: Joi.number(),
               // betValue: Joi.number(),
               gameMode:Joi.number().required(),
               //round:Joi.number().required(),
               //xfacEnable:Joi.boolean(),
               //maxpoints:Joi.number(),
          },
          players: Joi.array().items(Joi.object({
               name: Joi.string().required(),
               userId: Joi.string().required(),
               pState: Joi.number().required(),
               REFER_CODE: Joi.string().required()
          })),
          gameState: Joi.number().required(),
          processId: Joi.string().required(),
          turnNo: Joi.number().required(),
          createdOn: Joi.number().required()
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
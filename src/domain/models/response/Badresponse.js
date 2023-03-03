const ERROR_CODE= require("./error.dto")
class BadRequest extends Error {
    statusCode;
    data;
  
    constructor(message, code=ERROR_CODE.DEFAULT, data = {}) {
      super();
      this.message = message;
      this.name = 'BadRequest';
      this.data = data;
      this.statusCode = code;
      Error.captureStackTrace(this, BadRequest);
      Object.setPrototypeOf(this, BadRequest.prototype);
    }
  }

module.exports = {BadRequest}
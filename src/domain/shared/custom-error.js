
exports.createCustomError = (errorCode = 0, message = "") => {
     const err = new Error(message);
     err.message = message;
     err.name = message;
     return err;
}
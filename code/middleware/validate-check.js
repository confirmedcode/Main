const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const { validationResult } = require("express-validator/check");
const { matchedData } = require("express-validator/filter");

module.exports = (request, response, next) => {
  
  const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
    return { msg: msg, nestedErrors: nestedErrors };
  };
  
  const result = validationResult(request).formatWith(errorFormatter);
  
  if (!result.isEmpty()) {
    // Return the first error - check nested too
    var errorMessage = "";
    var firstError = result.array()[0];
    errorMessage = firstError.msg;
    if (firstError.nestedErrors && firstError.nestedErrors.length > 0) {
      errorMessage = firstError.nestedErrors[0].msg;
    }
    return next( new ConfirmedError(400, 3, errorMessage, result.array()) );
  }
  else {
    request.values = matchedData(request);
    next();
  }

};

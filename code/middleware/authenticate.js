const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Models
const { User } = require("shared/models");

const check = (request, response, next) => {
  
  if (request.session && request.session.userId && request.session.userId != "") {
    return next();
  }
  else {
    return next(new ConfirmedError(401, 2, "Session expired or invalid. Please sign in again."));
  }

};

const checkAndSetUser = (request, response, next) => {
  
  if (request.session && request.session.userId && request.session.userId != "") {
    const sessionUserId = request.session.userId;
    return User.getWithId(sessionUserId)
      .then( user => {
        request.user = user;
        return next();
      })
      .catch( error => next(error) );
  }
  else {
    return next(new ConfirmedError(401, 2, "Session expired or invalid. Please sign in."));
  }

};

module.exports = {
  check: check,
  checkAndSetUser: checkAndSetUser
};

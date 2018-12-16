const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const { body, query, check, oneOf } = require("express-validator/check");
const validateCheck = require("../middleware/validate-check.js");
const { BruteForce } = require("shared/redis");

// Models
const { User } = require("shared/models");

// Utilities
const Url = require('url');

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Sign In Page
 *
 *********************************************/

router.get("/signin",
[
  query("redirecturi")
    .trim(),
  validateCheck
],
(request, response, next) => {
  const redirecturi = request.values.redirecturi;
  // redirect to account if there's a valid session
  if (request.session && request.session.userId && request.session.userId != "") {
    if (redirecturi) {
      return response.redirect(redirecturi);
    }
    else {
      return response.redirect("/account");
    }
  }
  response.render("signin", {
    redirecturi: redirecturi
  });
});

router.post("/signin",
[ 
  BruteForce(250).prevent,
  oneOf(
    [
      [
        // Email/Password in POST
        body("email")
          .exists().withMessage("Missing email address.")
          .isEmail().withMessage("Invalid email address.")
          .normalizeEmail(),
        body("password")
          .exists().withMessage("Missing password.")
          .not().isEmpty().withMessage("Missing password."),
        check("redirecturi"),
      ],
      [ // android or ios receipt
        check("authtype")
          .isIn(["ios", "android"]).withMessage("Invalid IAP receipt type (must be ios/android)"),
        check("authreceipt")
          .exists().withMessage("Missing receipt data.")
          .not().isEmpty().withMessage("Missing receipt data.")
          .stripLow()
          .isBase64().withMessage("Invalid receipt data.")
      ]
    ]
  ),
  validateCheck
],
(request, response, next) => {
  if (request.values.email) {
    const email = request.values.email;
    const password = request.values.password;
    
    // make a safe redirect by only using the path component of the url
    var redirecturi = request.values.redirecturi || "/account";
    redirecturi = Url.parse(redirecturi).path;
    
    return User.getWithEmailAndPassword(email, password)
      .then( user => {
        if (user.emailConfirmed === true) {
          request.session.regenerate(error => {
            if (error) {
              throw new ConfirmedError(500, 99, "Couldn't regenerate session", error);
            }
            request.session.userId = user.id;
            request.session.save(error => {
              if (error) {
                throw new ConfirmedError(500, 99, "Couldn't save session", error);
              }
              return response.format({
                json: () => {
                  return response.status(200).json({
                    message: "Signed In",
                    code: 0
                  });
                },
                html: () => {
                  response.redirect(redirecturi);
                }
              });
            });
          });
        }
        else {
          throw new ConfirmedError(200, 1, "Email Not Confirmed");
        }
      })
      .catch( error => { next(error); });
  }
  else {
    const receiptData = request.values.authreceipt;
    const receiptType = request.values.authtype;
    return User.getWithIAPReceipt(receiptData, receiptType)
      .then(user => {
        request.session.regenerate(error => {
          if (error) {
            throw new ConfirmedError(500, 99, "Couldn't regenerate session", error);
          }
          request.session.userId = user.id;
          request.session.save(error => {
            if (error) {
              throw new ConfirmedError(500, 99, "Couldn't save session", error);
            }
            return response.status(200).json({
              message: "Signed In",
              code: 0
            });
          });
        });
      })
      .catch( error => next(error) );
  }
});

/*********************************************
 *
 * Log Out
 *
 *********************************************/

router.get("/logout",
BruteForce(20).prevent,
(request, response, next) => {
  if (request.session) {
    request.session.destroy(error => {
      if (error) {
        // Deleting an invalid session is not a throwing error
        Logger.error("Couldn't delete session: " + error.stack);
      }
      return response.redirect("/signin");
    });
  }
  else {
    response.redirect("/signin");
  }
});

module.exports = router;
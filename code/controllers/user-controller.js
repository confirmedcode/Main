const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const authenticate = require("../middleware/authenticate.js");
const { check, body, query, oneOf } = require("express-validator/check");
const validateCheck = require("../middleware/validate-check.js");
const passwordRules = require("../middleware/password-rules.js");
const { BruteForce } = require("shared/redis");

// Models
const { User } = require("shared/models");
const { Receipt } = require("shared/models");

// Constants
const VALID_PLATFORMS = ["android", "ios", "mac", "windows"];

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Sign Up Page
 *
 *********************************************/

router.get("/signup",
[
  query("refer"),
  validateCheck
],
(request, response, next) => {
  const refer = request.values.refer;
  var chain = Promise.resolve();
  if (refer) {
    chain = User.getReferrerUserId(refer);
  }
  return chain
    .then(referrerUserId => {
      if (referrerUserId) {
        response.render("signup", {
          refer: refer
        });
      }
      else {
        response.render("signup");
      }
    })
    .catch( error => { next(error); });
});

router.get("/signup-success",
(request, response, next) => {
  response.render("signup-success");
});

/*********************************************
 *
 * Create User with Email
 *
 *********************************************/

router.post("/signup",
[
  BruteForce(50),
  body("email")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),
  body("password")
    .exists().withMessage("Missing password.")
    .not().isEmpty().withMessage("Missing password.")
    .custom(value => {
      passwordRules(value);
      return value;
    }),
  check("browser")
    .toBoolean(false),
  oneOf([
    body("refer")
      .isAlphanumeric().withMessage("Referral code must be alphanumeric."),
    body("refer")
      .isEmpty()
  ]),
  check("lockdown")
    .toBoolean(false),
  validateCheck
],
(request, response, next) => {
  const email = request.values.email;
  const password = request.values.password;
  const browser = request.values.browser;
  const refer = request.values.refer;
  const lockdown = request.values.lockdown;
  var chain = Promise.resolve();
  if (refer) {
    chain = User.getReferrerUserId(refer);
  }
  return chain
    .then(referrerUserId => {
      return User.createWithEmailAndPassword(email, password, browser, referrerUserId, lockdown);
    })
    .then(user => {
      if (browser) {
        response.redirect("/signup-success");
      }
      else {
        response.status(200).json({
          code: 1,
          message: "Email Confirmation Sent"
        });
      }
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * Confirm Email
 *
 *********************************************/

router.get(["/confirm-email"],
[
  BruteForce(50),
  query("email")
    .exists().withMessage("Missing email.")
    .not().isEmpty().withMessage("Missing email.")
    .normalizeEmail()
    .isEmail().withMessage("Invalid email address."),
  query("code")
    .exists().withMessage("Missing confirmation code.")
    .not().isEmpty().withMessage("Missing confirmation code.")
    .isAlphanumeric().withMessage("Invalid confirmation code.")
    .trim(),
  query("browser")
    .toBoolean(false),
  check("lockdown")
    .toBoolean(false),
  validateCheck
],
(request, response, next) => {
  const email = decodeURI(request.values.email);
  const code = request.values.code;
  const browser = request.values.browser; 
  const lockdown = request.values.lockdown;
  return User.confirmEmail(code, email)
    .then(success => {
      if (lockdown) {
        return response.render("confirm-email-success-lockdown");
      }
      else if (browser) {
        return request.flashRedirect("success", "Email confirmed. Please sign in.", "/signin?redirecturi=" + encodeURI("/new-subscription?browser=true"));
      }
      else {
        return response.render("confirm-email-success");
      }
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * Resend Confirmation Code
 *
 *********************************************/

router.get("/resend-confirm-code",
(request, response, next) => {
  response.render("resend-confirm-code");
});

router.post("/resend-confirm-code",
[
  BruteForce(20),
  body("email")
  .exists().withMessage("Missing email address.")
  .isEmail().withMessage("Invalid email address.")
  .normalizeEmail(),
  check("lockdown")
    .toBoolean(false),
  validateCheck
],
(request, response, next) => {
  const email = request.values.email;
  const lockdown = request.values.lockdown;
  User.resendConfirmCode(email, true)
    .then( results => {
      request.flashRedirect("info", "Confirmation email re-sent. Be sure to check your spam folder, as sometimes the email can get stuck there.", "/signin");
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * Convert Shadow User - Add Email/Password
 *
 *********************************************/

router.post("/convert-shadow-user",
[
  BruteForce(30),
  authenticate.checkAndSetUser,
  body("newemail")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),
  body("newpassword")
    .exists().withMessage("Missing password.")
    .not().isEmpty().withMessage("Missing password.")
    .custom(value => {
      passwordRules(value);
      return value;
    }),
  validateCheck
],
(request, response, next) => {
  const newEmail = request.values.newemail;
  const newPassword = request.values.newpassword;
  if (request.user.emailHashed && request.user.emailConfirmed == true) {
    return next(new ConfirmedError(400, 48, "Can't convert shadow user that already has a confirmed email."));
  }
  return request.user.convertShadowUser(newEmail, newPassword)
    .then( result => {
      response.status(200).json({
        code: 1,
        message: "Email Confirmation Sent"
      });
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * Client Download Page
 *
 *********************************************/

router.get("/clients",
(request, response, next) => {
  response.render("clients");
});

/*********************************************
 *
 * Get Key
 *
 *********************************************/

router.post("/get-key",
[
  BruteForce(200),
  authenticate.checkAndSetUser,
  check("platform")
    .isIn(VALID_PLATFORMS).withMessage("Unrecognized platform."),
  validateCheck
],
(request, response, next) => {
  const platform = request.values.platform;
  return request.user.getKey(platform)
    .then(config => {
      response.status(200).json(config);
    })
    .catch(error => { next(error); });
});

/*********************************************
 *
 * Do Not Email
 *
 *********************************************/

router.get("/do-not-email",
[
  BruteForce(200),
  check("email")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),
  check("code")
    .isAlphanumeric().withMessage("Code must be alphanumeric"),
  validateCheck
],
(request, response, next) => {
  const email = request.values.email;
  const code = request.values.code;
  response.render("do-not-email", {
    code: code,
    email: email
  });
});
  
router.post("/do-not-email",
[
  BruteForce(20),
  body("email")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),
  body("code")
    .isAlphanumeric().withMessage("Code must be alphanumeric"),
  validateCheck
],
(request, response, next) => {
  const email = request.values.email;
  const code = request.values.code;
  User.setDoNotEmail(email, code)
    .then( result => {
      request.flashRedirect("info", "You will no longer receive any emails from us.", "/signin");
    })
    .catch(error => { next(error); });
});

module.exports = router;
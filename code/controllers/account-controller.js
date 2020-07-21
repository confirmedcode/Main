const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const authenticate = require("../middleware/authenticate.js");
const { body, query } = require("express-validator/check");
const validateCheck = require("../middleware/validate-check.js");
const passwordRules = require("../middleware/password-rules.js");
const { BruteForce } = require("shared/redis");
const csrf = require('csurf');
const csrfProtection = csrf();

// Utilities
const { Stripe } = require("shared/utilities");

// Models
const { User } = require("shared/models");

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Account Page
 *
 *********************************************/

router.get("/account",
[
  BruteForce(1000),
  authenticate.checkAndSetUser
],
(request, response, next) => {	
  let user = request.user;
  var activeSubs;
  var acceptsLanguage = request.headers["accept-language"] ? request.headers["accept-language"].split(",")[0] : "en-US";
  return request.user.getActiveSubscriptions()
    .then(result => {
      activeSubs = result;
      return user.getActiveReferrals();
    })
    .then(referrals => {
      response.set('Cache-Control', 'private, no-cache, no-store, max-age=0');
      response.render("account", {
        email: user.email,
        subscriptions: activeSubs, 
        hasStripeId: request.user.stripeId ? true : false,
        code: user.referralCode,
        referrals: referrals,
        percentOff: referrals.percentOff,
        referredBy: user.referredBy
      });
    })
    .catch( error => { next(error); });
});

/*********************************************
 *
 * Change Email
 *
 *********************************************/

router.get("/change-email",
authenticate.check,
csrfProtection,
(request, response, next) => {
  response.render("change-email", {
    csrfToken: request.csrfToken()
  });
});

router.post("/change-email",
[
  BruteForce(25),
  authenticate.checkAndSetUser,
  csrfProtection,
  body("newEmail")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),
  body("currentPassword")
    .exists().withMessage("Missing password.")
    .not().isEmpty().withMessage("Missing password.")
    .custom((value, {req, location, path}) => {
      return req.user.assertPassword(value)
      .catch( error => Promise.reject())
    }).withMessage("Incorrect password."),
  validateCheck
],
(request, response, next) => {
  const newEmail = request.values.newEmail;
  return request.user.changeEmail(newEmail)
    .then( success => {
      request.flashRedirect("info", "A confirmation has been sent to your new email. Please click the confirmation to complete this process.", "/account");
    })
    .catch(error => { next(error); });
});

/*********************************************
 *
 * Confirm Change Email
 *
 *********************************************/

router.get(["/confirm-change-email"],
[
  BruteForce(50),
  query("email")
    .exists().withMessage("Missing email.")
    .not().isEmpty().withMessage("Missing email.")
    .isEmail().withMessage("Invalid email address."),
  query("code")
    .exists().withMessage("Missing confirmation code.")
    .not().isEmpty().withMessage("Missing confirmation code.")
    .isAlphanumeric().withMessage("Invalid confirmation code.")
    .trim(),
  validateCheck
],
(request, response, next) => {
  const email = decodeURI(request.values.email);
  const code = request.values.code;
  return User.confirmChangeEmail(code, email)
    .then(success => {
      return request.flashRedirect("success", "Email change confirmed.", "/account");
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * Change Password
 *
 *********************************************/

router.get("/change-password",
authenticate.check,
csrfProtection,
(request, response, next) => {
  response.render("change-password", {
    csrfToken: request.csrfToken()
  });
});

router.post("/change-password",
[
  BruteForce(20),
  authenticate.checkAndSetUser,
  csrfProtection,
  body("currentPassword")
    .exists().withMessage("Missing current password.")
    .not().isEmpty().withMessage("Missing current password.")
    .custom((value, {req, location, path}) => {
      return req.user.assertPassword(value)
      .catch( error => Promise.reject())
    }).withMessage("Current password is incorrect."),
  body("newPassword")
    .exists().withMessage("Missing new password.")
    .not().isEmpty().withMessage("Missing new password.")
    .custom(value => {
      passwordRules(value);
      return value;
    }),
  validateCheck
],
(request, response, next) => {
  const currentPassword = request.values.currentPassword;
  const newPassword = request.values.newPassword;
  return request.user.changePassword(currentPassword, newPassword)
    .then( success => {
      request.flashRedirect("success", "Password changed successfully.", "/account");
    })
    .catch(error => { next(error); });
});

/*********************************************
 *
 * Invoices
 *
 *********************************************/

router.get("/invoices",
[
  BruteForce(200),
  authenticate.checkAndSetUser
],
(request, response, next) => {
  var invoices;
  Stripe.getInvoices(request.user.stripeId)
    .then(result => {
      invoices = result;
      return Stripe.getCharges(request.user.stripeId);
    })
    .then(result => {
      response.render("invoice-list", {
        invoices: invoices,
        charges: result
      });
    })
    .catch( error => {
      request.flashRedirect("error", "Error getting invoices.", "/account");
      Logger.error("Error getting invoices - " + (new Date()) + " - " + error.stack);
    });
});

/*********************************************
 *
 * Payment Methods Page
 *
 *********************************************/

router.get("/payment-methods",
[
  BruteForce(200),
  authenticate.checkAndSetUser
],
(request, response, next) => {
  return request.user.getPaymentMethods()
    .then(methods => {
      response.set('Cache-Control', 'private, no-cache, no-store, max-age=0');
      response.render("payment-methods", {
        methods: methods
      });
    })
    .catch( error => {
      request.flashRedirect("error", "Error getting payment methods.", "/account");
      Logger.error("Error getting payment methods - " + (new Date()) + " - " + error.stack);
    });
});

/*********************************************
 *
 * Add Payment Method
 *
 *********************************************/

router.get("/add-new-card",
authenticate.check,
(request, response, next) => {
  response.render("add-new-card");
});

router.post("/add-new-card",
[
  BruteForce(20),
  authenticate.checkAndSetUser,
  body("source")
    .exists().withMessage("Missing source.")
    .not().isEmpty().withMessage("Missing source."),
  validateCheck
],
(request, response, next) => {
  const source = request.values.source;
  return Stripe.createSource(request.user.stripeId, source)
    .then(result => {
      return response.format({
        json: () => {
          response.status(200).json({
            message: "Card added successfully."
          })
        },
        html: () => {
          request.flashRedirect("success", "Card added successfully.", "/payment-methods");
        }
      });
    })
    .catch( error => {
      next(new ConfirmedError(400, 108, "Error adding card.", error));
    });
});

/*********************************************
 *
 * Set Default Payment Method
 *
 *********************************************/

router.post("/set-default-card",
[
  BruteForce(50),
  authenticate.checkAndSetUser,
  body("cardId")
    .exists().withMessage("Missing card ID.")
    .not().isEmpty().withMessage("Missing card ID."),
  validateCheck
],
(request, response, next) => {
  const cardId = request.values.cardId;
  Stripe.setDefaultSource(request.user.stripeId, cardId)
    .then(result => {
      response.status(200).json({
        message: "New default set successfully"
      });
    })
    .catch( error => {
      next(new ConfirmedError(400, 109, "Error setting default card.", error));
    });
});

/*********************************************
 *
 * Delete Payment Method
 *
 *********************************************/

router.post("/delete-card",
[
  BruteForce(20),
  authenticate.checkAndSetUser,
  body("cardId")
    .exists().withMessage("Missing card ID.")
    .not().isEmpty().withMessage("Missing card ID."),
  validateCheck
],
(request, response, next) => {
  const cardId = request.values.cardId;
  // Get customer and payment methods
  Stripe.getCustomer(request.user.stripeId)
    .then(customer => {
      return Stripe.deleteSource(request.user.stripeId, cardId);
    })
    .then(success => {
      response.status(200).json({
        message: "Card deleted successfully"
      });
    })
    .catch( error => {
      next(error);
    });
});

module.exports = router;
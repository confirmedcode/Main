const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const authenticate = require("../middleware/authenticate.js");
const { body, query, oneOf } = require("express-validator/check");
const validateCheck = require("../middleware/validate-check.js");
const { BruteForce } = require("shared/redis");

// Utilities
const { Stripe } = require("shared/utilities");

// Models
const { User } = require("shared/models");
const { Receipt } = require("shared/models");
const { Subscription } = require("shared/models");

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Get Subscriptions
 *
 *********************************************/

router.post("/subscriptions",
BruteForce(300),
authenticate.checkAndSetUser,
(request, response, next) => {
  request.user.getSubscriptions(true)
    .then(subscriptions => {
      response.status(200).json(subscriptions);
    })
    .catch(error => next(error));
});

/*********************************************
 *
 * Get Active Subscriptions
 *
 *********************************************/

router.post("/active-subscriptions",
BruteForce(300),
authenticate.checkAndSetUser,
(request, response, next) => {
  request.user.getActiveSubscriptions(true)
    .then( subscriptions => {
      response.status(200).json(subscriptions);
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * New Subscription
 *
 *********************************************/

router.get("/new-subscription",
[
  BruteForce(100),
  authenticate.checkAndSetUser,
  query("source"), // for 3d secure
  query("client_secret"), // for 3d secure
  query("upgrade"),
  query("browser")
    .toBoolean(false),
  query("plan"),
  query("locale"),
  validateCheck
],
(request, response, next) => {	
  const upgrade = request.values.upgrade; // If from ios/android, tell user to delete old subscription
  const browser = request.values.browser;
  const source = request.values.source;
  const client_secret = request.values.client_secret;
  const plan = request.values.plan || "all-monthly";
  const browserLocale = request.getLocale() || "none";
  const paramLocale = request.values.locale || "none";
  // if user had any previous subscriptions, trial = false
  var trial = true;
  
  var referralsPercentOff = 0;
  // create a Stripe customer if doesn't exist
  return request.user.createStripeCustomer()
  .then(result => {
    return request.user.getActiveReferrals();
  })
  .then(referrals => {
    referralsPercentOff = referrals.percentOff;
    return request.user.getSubscriptions();
  })
  .then(result => {
    if (result.length > 0) {
      trial = false;
    }
    // if user has an ACTIVE pro subscription, don't proceed
    return request.user.getActiveProSubscriptions();
  })
  .then(activeProSubscriptions => {
    if (activeProSubscriptions.length > 0) {
      return request.flashRedirect("info", "You already have an active Pro subscription.", "/account");
    }
    else {
      var country = "us";
      if (browserLocale != "none") {
        country = browserLocale.split("-")[1];
      }
      else if (paramLocale != "none") {
        country = paramLocale.split("-")[1];
      }
      var currency = Stripe.countryMap[country] || "usd";
      var formatter = new Intl.NumberFormat(request.values.locale || request.getLocale(), {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2
      });
      return request.user.getPaymentMethods()
      .then( methods => {
        response.render("new-subscription", {
          source: source,
          client_secret: client_secret,
          methods: methods,
          currency: currency,
          plan: plan,
          trial: trial,
          upgrade: upgrade,
          browser: browser,
          browserLocale: browserLocale.toLowerCase(),
          paramLocale: paramLocale,
          month: formatter.format(Stripe.currencyToPrice[currency].monthly),
          year: formatter.format(Stripe.currencyToPrice[currency].annual),
          referredBy: request.user.referredBy,
          monthDiscounted: Math.floor((Stripe.currencyToPrice[currency].monthly * (100 - referralsPercentOff)/100) * 100),
          annualDiscounted: Math.floor((Stripe.currencyToPrice[currency].annual * (100 - referralsPercentOff)/100) * 100),
        });
      })
      .catch( error => {
        throw new ConfirmedError(500, 99, "Error getting payment methods for user.");
      });
    }
  })
  .catch( error => next(error) );
});

router.post("/new-subscription", 
[
  BruteForce(50),
  authenticate.checkAndSetUser,
  body("source")
    .exists().withMessage("Missing source.")
    .not().isEmpty().withMessage("Missing source.")
    .trim(),
  body("is3ds")
    .toBoolean(false),
  body("trial")
    .exists().withMessage("Missing trial.")
    .not().isEmpty().withMessage("Missing trial.")
    .toBoolean(true),
  body("plan")
    .exists().withMessage("Missing plan.")
    .not().isEmpty().withMessage("Missing plan.")
    .isIn(["all-monthly", "all-annual"]).withMessage("Invalid plan type."),
  body("upgrade"),
  body("browser")
    .toBoolean(false),
  body("browserLocale"),
  body("paramLocale"),
  validateCheck
],
(request, response, next) => {
  const source = request.values.source;
  const is3ds = request.values.is3ds;
  const trial = request.values.trial;
  const plan = request.values.plan;
  const upgrade = request.values.upgrade;
  const browser = request.values.browser;
  // ParamLocale is prioritized over BrowserLocale
  const browserLocale = request.values.browserLocale || "none";
  const paramLocale = request.values.paramLocale || "none";
  
  return request.user.createStripeCustomer()
  .then(customer => {
    return request.user.getSubscriptions();
  })
  .then( result => {
    if (result.length > 0 && trial == true) {
      throw new ConfirmedError(400, 29, "Already had a trial, not allowing another trial.");
    }
    return request.user.createStripeSubscription(source, plan, trial, browserLocale, paramLocale, is3ds);
  })
  .then( result => {
    if (upgrade == "ios-monthly" || upgrade == "ios-annual") {
      request.flashRedirect("info", "You've successfully upgraded from the iOS-only plan to the Pro Plan for all devices. Be sure to cancel your iOS-only subscription with Apple iTunes.", "/account");
    }
    else if (upgrade == "android-monthly" || upgrade == "android-annual") {
      request.flashRedirect("info", "You've successfully upgraded from the Android-only plan to the Pro Plan for all devices. Be sure to cancel your Android subscription with Google Play.", "/account");
    }
    else if (browser) {
      response.redirect("/clients");
    }
    else {
      response.redirect("tunnels://stripesuccess");
    }
  })
  .catch( error => {
      if (browser == true) {
        Logger.info("Error processing card: " + error.stack);
        request.flashRedirect("error", "Error processing card. Please double check card information.", "/new-subscription?browser=true");
      }
      else {
        next(error);
      }
    }
  );
});

/*********************************************
 *
 * Subscription Event - Updates an IAP receipt
 *
 *********************************************/

router.post("/subscription-event", 
[
  BruteForce(100),
  authenticate.checkAndSetUser,
  body("authtype")
    .isIn(["ios", "android"]).withMessage("Invalid IAP receipt type (must be ios/android)"),
  body("authreceipt")
    .exists().withMessage("Missing receipt data.")
    .not().isEmpty().withMessage("Missing receipt data.")
    .stripLow()
    .isBase64().withMessage("Invalid receipt data."),
  validateCheck
],
(request, response, next) => {
  const receiptData = request.values.authreceipt;
  const receiptType = request.values.authtype;
  return Receipt.createWithIAP(receiptData, receiptType)
    .then(receipt => {
      return Subscription.updateWithUserAndReceipt(request.user, receipt)
    })
    .then(subscription => {
      response.status(200).json({
        message: "Subscription Updated"
      });
    })
    .catch( error => next(error) );
});

/*********************************************
 *
 * Cancel Subscription
 *
 *********************************************/

router.get("/cancel-subscription",
[
  BruteForce(50),
  authenticate.check,
  query("receiptId")
    .exists().withMessage("Missing receipt ID.")
    .not().isEmpty().withMessage("Missing receipt ID.")
    .trim(),
  query("receiptType")
    .isIn(["ios", "android", "stripe"]).withMessage("Invalid receipt type."),
  validateCheck
],
(request, response, next) => {
  const receiptId = request.values.receiptId;
  const receiptType = request.values.receiptType;
  if (receiptType == "ios") {
    request.flashRedirect("info", "Subscriptions made through the iOS app must be cancelled through Apple.", "/account");
  }
  else if (receiptType == "android") {
    request.flashRedirect("info", "Subscriptions made through the Android app must be cancelled through Google Play.", "/account");
  }
  else {
    response.render("cancel-subscription", {
      receiptId: receiptId
    });
  }
});

router.post("/cancel-subscription",
[
  authenticate.checkAndSetUser,
  body("receiptId")
    .exists().withMessage("Missing receipt ID.")
    .not().isEmpty().withMessage("Missing receipt ID.")
    .trim(),
  body("reason"),
  validateCheck
],
(request, response, next) => {
  const receiptId = request.values.receiptId;
  const reason = request.values.reason || "none";
  Logger.error("Subscription cancellation reason: " + reason);
  return request.user.cancelSubscriptionWithReceiptId(receiptId)
    .then( result => {
      request.flashRedirect("success", "Subscription cancelled successfully.", "/account");
    })
    .catch( error => next(error) );
});

module.exports = router;
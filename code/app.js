// Load environment
require("./config/environment.js");

// Shared
const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Constants
const DOMAIN = process.env.DOMAIN;
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;
const NODE_ENV = process.env.NODE_ENV;
const ENVIRONMENT = process.env.ENVIRONMENT;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Express and body parsers
const express = require("express");
const app = express();
var BODY_LIMIT = "3mb";
if (ENVIRONMENT == "PRODUCTION" || ENVIRONMENT == "PROD") {
  BODY_LIMIT = "1mb";
}
app.use(express.json({
  limit: BODY_LIMIT,
  extended: true
}));
app.use(express.urlencoded({
  limit: BODY_LIMIT,
  extended: true
}));

// Main only logs errors
const expressWinston = require("express-winston");
expressWinston.requestWhitelist = ["url", "method", "httpVersion", "originalUrl"];
app.use(expressWinston.logger({
  winstonInstance: Logger,
  skip: function (request, response) {
    if (response.statusCode < 400) {
      return true;
    }
    return false;
  }
}));

// Log unhandled rejections
process.on("unhandledRejection", error => {
  Logger.error(`unhandledRejection:
    ${error.stack}`);
});

// Basic Security
app.use(require("helmet")());

// View Engine
const fullicu = require("full-icu");
const i18n = require("./config/i18n.js");
app.use(i18n.init);
app.engine(".hbs", require("express-handlebars")({
  defaultLayout: "main",
  extname: ".hbs",
  partialsDir: __dirname + "/views/partials/",
  helpers: {
    "__": function () {
      return i18n.__.apply(this, arguments);
    }
  }
}));
app.set("view engine", ".hbs");
app.locals.DOMAIN = DOMAIN;
app.locals.STRIPE_PUBLIC_KEY = STRIPE_PUBLIC_KEY;
app.use(express.static("public"));

// Sessions/Flash
app.use(require("./config/session.js"));
if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Controllers
app.use("/", require("./controllers/account-controller.js"));
app.use("/", require("./controllers/download-controller.js"));
app.use("/", require("./controllers/notification-controller.js"));
app.use("/", require("./controllers/reset-password-controller.js"));
app.use("/", require("./controllers/signin-controller.js"));
app.use("/", require("./controllers/subscription-controller.js"));
app.use("/", require("./controllers/user-controller.js"));

// Landing Page Localized Prices
const { Stripe } = require("shared/utilities");
app.get("/", (request, response, next) => {
  var country = request.getLocale().split("-")[1] || "us";
  var currency = Stripe.countryMap[country] || "usd";
  var formatter = new Intl.NumberFormat(request.getLocale(), {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  });
  return response.render("index", {
    half: formatter.format(Stripe.currencyToPrice[currency].half),
    month: formatter.format(Stripe.currencyToPrice[currency].monthly),
    annualmonth: formatter.format(Stripe.currencyToPrice[currency].annual/12)
  });
});

app.get("/about-us", (request, response, next) => {
  return response.render("about-us");
});

app.get("/why-vpn", (request, response, next) => {
  var ip = request.ip;
  var ipHeader = request.headers['x-forwarded-for'];
  if ( ipHeader ) {
    var ipHeaderSplit = ipHeader.split(",");
    if (ipHeaderSplit.length > 0 ) {
      ip = ipHeaderSplit[0];
    }
  }
  return response.render("why-vpn", {
    ip: ip
  });
});

app.get("/openly-operated", (request, response, next) => {
  return response.render("openly-operated");
});

app.get(["/privacy", "/privacy.html"], (request, response, next) => {
  return response.render("privacy");
});

app.get(["/terms", "/terms.html"], (request, response, next) => {
  return response.render("terms");
});

app.get(["/support"], (request, response, next) => {
  return response.render("support");
});

app.get(["/contact"], (request, response, next) => {
  return response.render("contact");
});

app.get("/error-test", (request, response, next) => {
  next(new ConfirmedError(500, 999, "Test alerts", "Details here"));
});

// Get IP
function getIpHandler(request, response, next) {
  var ip = request.ip;
  var ipHeader = request.headers['x-forwarded-for'];
  if ( ipHeader ) {
    var ipHeaderSplit = ipHeader.split(",");
    if (ipHeaderSplit.length > 0 ) {
      ip = ipHeaderSplit[0];
    }
  }
  response.status(200).json({
    ip: ip
  });
}

const subdomain = require('express-subdomain');
const ipRouter = express.Router();
ipRouter.get("/ip", getIpHandler);
app.use(subdomain('ip', ipRouter));

app.get("/ip", getIpHandler);

app.get("/health", (request, response, next) => {
  response.status(200).json({
    message: "OK from " + DOMAIN
  });
});

// Log Errors
app.use(expressWinston.errorLogger({
  winstonInstance: Logger
}));

// Handle Errors
app.use((error, request, response, next) => {
  if (response.headersSent) {
    Logger.error("RESPONSE ALREADY SENT");
    return;
  }
  return response.format({
    json: () => {
      if (error.statusCode >= 200 && error.statusCode < 500) {
        response.status(error.statusCode).json({
          code: error.confirmedCode,
          message: error.message
        });
      }
      else {
        response.status(500).json({
          code: -1,
          message: "Unknown Internal Error"
        });
      }
    },
    html: () => {
      if (error.statusCode == 401) {
        if (request.originalUrl.startsWith("/signin")) {
          request.flashRedirect("error", error.message, request.originalUrl);
        }
        else {
          request.flashRedirect("error", error.message, "/signin");
        }
      }
      else if (error.statusCode >= 200 && error.statusCode < 500) {
        if (error.confirmedCode == 1) {
          response.redirect("/resend-confirm-code");
        }
        else {
          request.flashRedirect("error", error.message, request.originalUrl);
        }
      }
      else {
        request.flashRender("error", "Unknown Internal Error", "notification");
      }
    }
  });

});

// Handle 404 Not Found
app.use((request, response, next) => {
  Logger.info("404 NOT FOUND - " + request.originalUrl);
  return response.format({
    json: () => {
      response.status(404).json({
        code: 404,
        message: "Not Found"
      });
    },
    html: () => {
      request.flashRender("error", "The page you are looking for does not exist.", "notification", 404);
    }
  });
});

module.exports = app;

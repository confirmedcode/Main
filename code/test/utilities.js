// Make a master DB connection for resetting the db and server
const { Pool } = require("pg");
const Schema = require("shared/schema");
const Database = new Pool({
  host: process.env.PG_HOST,
  database: "master",
  user: "master",
  password: process.env.PG_ADMIN_PASSWORD,
  port: 5432,
  ssl: process.env.ENVIRONMENT === "LOCAL" ? false : true,
  max: 20,
  min: 4,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 10000,
});

const Client = require("./client.js");
const RedisClient = require("shared/redis").Client;

const fs = require("fs-extra");
const path = require("path");
const cheerio = require('cheerio');

const { Certifiate } = require("shared/utilities");
const { Secure } = require("shared/utilities");
const { Stripe } = require("shared/utilities");

const EMAIL_SALT = process.env.EMAIL_SALT;

const originalDateNow = Date.now;

module.exports = {
  
  /**************************
  ******* AGENT SIGNIN ******
  **************************/

  signin: (agent, email = TEST_EMAIL, password = TEST_PASSWORD) => {
    return agent
      .post("/signin")
      .send({
        email: email,
        password: password
      });
  },

  logout: (agent) => {
    return agent
      .get("/logout");
  },
  
  /**************************
  ******* DATE CHANGE *******
  **************************/
  
  // Used to make iOS/Android receipts from the past valid
  changeDate: (dateString = "March 28, 2018 11:00:00") => {
    Date.now = function() {
      return new Date(dateString);
    };
  },
  
  resetDate: () => {
    Date.now = originalDateNow;
  },
  
  /********************
  ******** CSRF *******
  *********************/
  
  getCsrfToken: (response) => {
    var $ = cheerio.load(response.text);
    return $('[name=_csrf]').val();
  },
  
  /********************
  **** STRIPE TOKEN ***
  *********************/
  
  makeStripeSource: (token) => {
    return Stripe.stripe.sources.create({
      type: "card",
      token: token
    })
  },
  
  /********************
  ******* RESET *******
  ********************/

  reset: () => {
    Client.resetAgent();
    RedisClient.flushall();
    return module.exports.resetDatabase()
      .then(result => {
        return module.exports.addData();
      });
  },

  resetDatabase: () => {
    return Schema.getTemplated(
      "main_pw",
      "helper_pw",
      "renewer_pw",
      "support_pw",
      "partner_pw",
      "webhook_pw",
      "debug_pw"
    )
    .then( schema => {
      schema =
       `-- Disconnect all connected clients
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid();
        -- Drop tables, roles
        DROP SCHEMA public CASCADE;
        DROP ROLE IF EXISTS main, helper, renewer, support, partner, webhook, debug;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO master;
        -- Create tables
        ${schema}
        -- Allow users to access tables
        GRANT USAGE ON SCHEMA public TO main, helper, renewer, support, partner, webhook, debug;`;
      return Database.query(schema);
    })
  },
  
  /********************
  ***** TEST DATA *****
  ********************/
  
  addData: () => {
    return module.exports.addCertificates()
      .then(result => {
        return module.exports.addUser();
      })
      .then(result => {
        return module.exports.addSubscription();
      });
  },
  
  addCertificatesBatchNonWorking: (numCerts) => {
    let chain = Promise.resolve();
    for (var i = 0; i < numCerts; i++) {
      chain = chain.then(() => {
        return Database.query(
        `INSERT INTO certificates("serial","source_id","user_id","revoked","assigned","p12_encrypted")
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [Secure.randomString(10), "localsource", Secure.randomString(32), false, false, "test"]);
      })
    }
    return chain;
  },

  addCertificates: () => {
    var addCertificatesSql = fs.readFileSync(path.join(__dirname, "test-files", "add-certificates.sql"), "utf-8");
    return Database.query(addCertificatesSql)
      .then( result => {
        if (result.rowCount !== 10) {
          throw Error("Error inserting certificates in database");
        }
      });
  },

  addUser: () => {
    var addTestUser = fs.readFileSync(path.join(__dirname, "test-files", "add-user.sql"), "utf-8");
    return Database.query(addTestUser)
      .then( result => {
        if (result.rowCount !== 1) {
          throw Error("Error inserting test user in database");
        }
      });
  },

  addSubscription: () => {
    var addTestSubscription = fs.readFileSync(path.join(__dirname, "test-files", "add-subscription.sql"), "utf-8");
    return Database.query(addTestSubscription)
      .then( result => {
        if (result.rowCount !== 1) {
          throw Error("Error inserting test subscription in database");
        }
      });
  },
  
  addActiveIosSubscription: () => {
    var addTestSubscription = fs.readFileSync(path.join(__dirname, "test-files", "add-active-ios-subscription.sql"), "utf-8");
    return Database.query(addTestSubscription)
      .then( result => {
        if (result.rowCount !== 1) {
          throw Error("Error inserting test subscription in database");
        }
      });
  },
  
  addOldIosSubscription: () => {
    var addOldIosSubscription = fs.readFileSync(path.join(__dirname, "test-files", "add-old-ios-subscription.sql"), "utf-8");
    return Database.query(addOldIosSubscription)
      .then( result => {
        if (result.rowCount !== 1) {
          throw Error("Error inserting old subscription in database");
        }
      });
  },

}
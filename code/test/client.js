const chai = require("chai");
chai.use(require("chai-http"));
const server = require("../app");

const Constants = require('./constants.js');

const { User } = require("shared/models");

var agent = chai.request.agent(server);

module.exports = {
  
  agent: agent,

  resetAgent: () => {
    if (agent) {
      agent.close();
      agent = chai.request.agent(server);
    }
  },
  
  getUrl: (url, params = {}) => {
    return agent
      .get(url)
      .query(params);
  },
  
  postUrl: (url, params = {}) => {
    return agent
      .post(url)
      .send(params);
  },
  
  signup: (email = Constants.NEW_USER_EMAIL, password = Constants.NEW_USER_PASSWORD, browser = null, refer = null) => {
    return agent
      .post("/signup")
      .send({
        email: email,
        password: password,
        browser: browser,
        refer: refer
      });
  },
  
  signupConfirm: (email = Constants.NEW_USER_EMAIL, password = Constants.NEW_USER_PASSWORD, browser = null) => {
    return module.exports.signup()
      .then(response => {
        return User.getWithEmail(email);
      })
      .then( user => {
        return module.exports.confirmEmail(email, user.emailConfirmCode);
      });
  },
  
  signupConfirmSignin: (email = Constants.NEW_USER_EMAIL, password = Constants.NEW_USER_PASSWORD, browser = null) => {
    return module.exports.signup()
      .then(response => {
        return User.getWithEmail(email);
      })
      .then( user => {
        return module.exports.confirmEmail(email, user.emailConfirmCode);
      })
      .then(response => {
        return module.exports.signinWithEmail(email, password);
      });
  },
  
  confirmEmail: (email = Constants.NEW_USER_EMAIL, code, browser = null) => {
    return agent
      .get("/confirm-email")
      .query({
        code: code,
        email: email,
        browser: browser
      });
  },
  
  changeEmail: (newEmail, password, csrf) => {
    return agent
      .post("/change-email")
      .send({
        newEmail: newEmail,
        currentPassword: password,
        _csrf: csrf
    });
  },
  
  confirmChangeEmail: (newEmail, code) => {
    return agent
      .get("/confirm-change-email")
      .query({
        email: newEmail,
        code: code
    });
  },
  
  resendConfirmCode: (email = Constants.NEW_USER_EMAIL) => {
    return agent
      .post("/resend-confirm-code")
      .send({
        email: email
      });
  },
  
  convertShadowUser: (newemail = Constants.NEW_USER_EMAIL, newpassword = Constants.NEW_USER_PASSWORD) => {
    return agent
      .post("/convert-shadow-user")
      .send({
        newemail: newemail,
        newpassword: newpassword
      });
  },
  
  getKey: (platform) => {
    return agent
      .post("/get-key")
      .send({
        platform: platform
      });
  },
  
  signinWithEmail: (email = Constants.EXISTING_USER_EMAIL, password = Constants.EXISTING_USER_PASSWORD, browser = false, redirecturi) => {
    return agent
      .post("/signin")
      .set("Accept", getContentType(browser))
      .send({
        email: email,
        password: password,
        redirecturi: redirecturi
      });
  },
  
  doNotEmail: (email = Constants.EXISTING_USER_EMAIL, code = Constants.EXISTING_USER_DO_NOT_EMAIL_CODE) => {
    return agent
      .post("/do-not-email")
      .send({
        email: email,
        code: code
      });
  },
  
  signinWithReceipt: (authtype, authreceipt, partner = null) => {
    return agent
      .post("/signin")
      .send({
        authtype: authtype,
        authreceipt: authreceipt,
        partner: partner
      });
  },
  
  logout: (authtype, authreceipt) => {
    return agent
      .get("/logout");
  },
  
  changePassword: (currentPassword, newPassword, csrf) => {
    return agent
      .post("/change-password")
      .send({
        currentPassword: currentPassword,
        newPassword: newPassword,
        _csrf: csrf
      });
  },
  
  addNewCard: (source) => {
    return agent
      .post("/add-new-card")
      .send({
        source: source
      });
  },
  
  setDefaultCard: (cardId) => {
    return agent
      .post("/set-default-card")
      .send({
        cardId: cardId
      });
  },
  
  deleteCard: (cardId) => {
    return agent
      .post("/delete-card")
      .send({
        cardId: cardId
      });
  },
  
  forgotPassword: (email) => {
    return agent
      .post("/forgot-password")
      .send({
        email: email
      });
  },
  
  resetPassword: (code, newPassword) => {
    return agent
      .post("/reset-password")
      .send({
        code: code,
        newPassword: newPassword
      });
  },
  
  newSubscription: (source, trial, plan, upgrade, browser, browserLocale, paramLocale) => {
    return agent
      .post("/new-subscription")
      .send({
        source: source,
        trial: trial,
        plan: plan,
        upgrade: upgrade,
        browser: browser,
        browserLocale: browserLocale,
        paramLocale: paramLocale
      });
  },
  
  subscriptions: () => {
    return agent
      .post("/subscriptions");
  },
  
  activeSubscriptions: () => {
    return agent
      .post("/active-subscriptions");
  },
  
  subscriptionEvent: (authtype, authreceipt) => {
    return agent
      .post("/subscription-event")
      .send({
        authtype: authtype,
        authreceipt: authreceipt
      });
  },
  
  cancelSubscription: (receiptId, reason) => {
    return agent
      .post("/cancel-subscription")
      .send({
        receiptId: receiptId,
        reason: reason
      });
  }
  
}

function getContentType(isBrowser) {
  if (isBrowser) {
    return "text/html";
  }
  else {
    return "application/json";
  }
}
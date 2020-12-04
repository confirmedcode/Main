const should = require("chai").should();
const sinon = require("sinon");
const Client = require("../client.js");
const Constants = require('../constants.js');
const {
  reset,
  changeDate,
  resetDate,
  addActiveIosSubscription,
  addOldIosSubscription,
  makeStripeSource
} = require("../utilities.js");

const {
  User
} = require("shared/models");
const {
  Certificate
} = require("shared/models");
const {
  Stripe
} = require("shared/utilities");
const {
  Email
} = require("shared/utilities");

const TWENTY_DAYS = 20 * 86400000;
const NEW_CARD_TOKEN = "tok_amex";
const NEW_CARD_GB_TOKEN = "tok_gb";

describe("Subscription Controller", () => {

  beforeEach(reset);

  describe("POST /subscriptions", () => {

    describe("Success", () => {
      describe("New account", () => {
        it("should show 0 subscriptions", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.subscriptions();
            })
            .then(response => {
              response.body.length.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Existing account with Stripe subscription", () => {
        it("should show 1 subscription", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.subscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create account with iOS receipt", () => {
        it("should show 1 subscription", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.subscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create account with iOS receipt, then add a Stripe subscription", () => {
        it("should show 1 expired and 1 active subscription", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(result => {
              return Client.newSubscription(result.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.subscriptions();
            })
            .then(response => {
              response.body.length.should.equal(2);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {
      it("not logged in, should fail", (done) => {
        Client.subscriptions()
          .then(response => {
            response.should.have.status(401);
            response.body.message.should.contain("Session expired");
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

  });

  describe("POST /active-subscriptions", () => {

    describe("Success", () => {

      describe("New account", () => {
        it("should show 0 active subscriptions", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Existing account with Stripe subscription", () => {
        it("should show 1 active subscription", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create account with iOS receipt, set date to past", () => {
        after(resetDate);
        it("should show 1 active subscription", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              changeDate();
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create account with iOS receipt, don't change date", () => {
        it("should show 0 active subscription", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create account with iOS receipt (expired), then add a Stripe subscription", () => {
        it("should show 1 active subscription", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create account with Stripe subscription, then cancel it", () => {
        it("should show 1 active subscription, then 0 active subscriptions", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, true, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              let newSubscriptionId = response.body[0].receiptId;
              return Client.cancelSubscription(newSubscriptionId, "test");
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {
      it("not logged in, should fail", (done) => {
        Client.activeSubscriptions()
          .then(response => {
            response.should.have.status(401);
            response.body.message.should.contain("Session expired");
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

  });

  describe("GET /new-subscription", () => {

    describe("Success", () => {

      describe("From Browser", () => {
        it("should show nav bar", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.getUrl("/new-subscription", {
                browser: true
              });
            })
            .then(response => {
              response.text.should.contain("js.stripe.com");
              response.text.should.contain("Sign Out");
              response.text.should.contain("Download");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("From Mac/Windows Client", () => {
        it("should show not show nav bar", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.getUrl("/new-subscription");
            })
            .then(response => {
              response.text.should.not.contain("Sign Out");
              response.text.should.not.contain("Download");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Show trial text for new users", () => {
        it("should show trial text", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.getUrl("/new-subscription");
            })
            .then(response => {
              response.text.should.contain("Start Free 1 Week Trial");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Don't show trial text for old users", () => {
        it("should show trial text", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/new-subscription");
            })
            .then(response => {
              response.text.should.not.contain("Start Free 1 Week Trial");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Show existing payment methods on new subscription page", () => {
        it("should show payment methods", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              let newSubscriptionId = response.body[0].receiptId;
              return Client.cancelSubscription(newSubscriptionId, "test");
            })
            .then(response => {
              return Client.getUrl("/new-subscription");
            })
            .then(response => {
              response.text.should.contain("American Express");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Show different locale using browser header", () => {
        it("should show £8.99/month for en-GB", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.getUrl("/new-subscription")
                .set('Accept-Language', 'en-GB');
            })
            .then(response => {
              response.text.should.contain("£8.99/month");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Show different locale using parameter", () => {
        it("should show 99,99 €/year for de-de", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return Client.getUrl("/new-subscription", {
                locale: "de-de"
              });
            })
            .then(response => {
              response.text.should.contain("99,99 €/year");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("Don't allow multiple Pro subscriptions", () => {
        it("should tell existing user they already have Pro subscription", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/new-subscription");
            })
            .then(response => {
              response.text.should.contain("You already have an active Pro subscription");
              response.redirects[0].should.contain("/account");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("POST /new-subscription", () => {

    describe("Success", () => {

      describe("Use Token", () => {
        it("Sign in and create new subscription", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              response.headers["location"].should.contain("tunnels://stripesuccess");
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Use token, browser = true", () => {
        it("Should redirect to /clients", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly", null, true);
            })
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/clients");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Use token, upgrade from iOS", () => {
        it("Should show iOS upgrade message", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly", "ios-monthly", true);
            })
            .then(response => {
              response.text.should.contain("successfully upgraded from the iOS-only ");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Use token, upgrade from Android", () => {
        it("Should show Android upgrade message", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly", "android-monthly", true);
            })
            .then(response => {
              response.text.should.contain("successfully upgraded from the Android-only ");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Use Existing Source", () => {
        it("New user, create subscription, cancel it, create subscription again with old source", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              let newSubscriptionId = response.body[0].receiptId;
              return Client.cancelSubscription(newSubscriptionId, "test");
            })
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Stripe.getPaymentMethods(user.stripeId);
            })
            .then(methods => {
              return Client.newSubscription(methods[0].id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("New subscription with GBP card", () => {
        it("Should create subscription with GBP plan and user should have GBP currency at Stripe", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_GB_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-annual", null, false, "en-gb", null)
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              let newSubscriptionId = response.body[0].receiptId;
              return Stripe.getSubscription(newSubscriptionId);
            })
            .then(response => {
              response.plan.id.should.equal("all-annual-gbp");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return user.getStripeCurrency();
            })
            .then(stripeCurrency => {
              stripeCurrency.should.equal("gbp");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe.skip("New subscription upgrade from Android", () => {
        it("Should show upgrade page and instructions to cancel Android", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-annual", "android-monthly")
            })
            .then(response => {
              response.text.should.contain("successfully upgraded from the Android-only");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("Don't allow two trials", () => {
        it("New user, create subscription, cancel it, create subscription again with old source", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, true, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              response.body.message.should.contain("Already had a trial");
              response.body.code.should.equal(29);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("POST /subscription-event", () => {

    describe("Success", () => {

      describe("Add iOS receipt to existing user", () => {
        it("should have 2 subscriptions: 1 iOS, 1 Stripe", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.subscriptionEvent("ios", Constants.IOS_RECEIPT_VALID)
            })
            .then(response => {
              response.status.should.equal(200);
              response.body.message.should.equal("Subscription Updated");
              return Client.subscriptions();
            })
            .then(response => {
              response.text.should.contain(Constants.IOS_RECEIPT_VALID_ID)
              response.body.length.should.equal(2);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe.skip("Add Android receipt to existing user", () => {
        it("should have 2 subscriptions: 1 iOS, 1 Stripe", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.subscriptionEvent("android", Constants.ANDROID_RECEIPT_VALID)
            })
            .then(response => {
              response.status.should.equal(200);
              response.body.message.should.equal("Subscription Updated");
              return Client.subscriptions();
            })
            .then(response => {
              response.text.should.contain(Constants.ANDROID_RECEIPT_VALID_ID)
              response.body.length.should.equal(2);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Update iOS Receipt", () => {
        it("should have 2 subscriptions: 1 iOS, 1 Stripe, and the iOS one should be updated from expiring in 2000 to 2018", (done) => {
          addOldIosSubscription()
            .then(() => {
              return Client.signinWithEmail();
            })
            .then(response => {
              return Client.subscriptions();
            })
            .then(response => {
              response.text.should.contain("2000-04-02T16:31:12.000");
              return Client.subscriptionEvent("ios", Constants.IOS_RECEIPT_VALID)
            })
            .then(response => {
              response.status.should.equal(200);
              response.body.message.should.equal("Subscription Updated");
              return Client.subscriptions();
            })
            .then(response => {
              response.text.should.contain("2018-04-02T16:31:12.000");
              response.text.should.contain(Constants.IOS_RECEIPT_VALID_ID)
              response.body.length.should.equal(2);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("No session", () => {
        it("Should fail", (done) => {
          Client.subscriptionEvent("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              response.should.have.status(401);
              response.body.message.should.contain("Session expired");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("GET /cancel-subscription", () => {

    describe("Success", () => {

      describe("Show cancel subcription page for Stripe", () => {
        it("should succeed", (done) => {
          var newSubscriptionId = "";
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              newSubscriptionId = response.body[0].receiptId;
              return Client.getUrl("/cancel-subscription", {
                receiptId: newSubscriptionId,
                receiptType: "stripe"
              });
            })
            .then(response => {
              response.text.should.contain("Are you sure you want to cancel your subscription?");
              response.text.should.contain(newSubscriptionId);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("not logged in", () => {
        it("should fail", (done) => {
          Client.getUrl("/cancel-subscription", {
              receiptId: "some_receipt",
              receiptType: "ios"
            })
            .end((error, response) => {
              response.should.have.status(401);
              response.body.message.should.contain("Session expired");
              done();
            });
        });
      });

      describe("Cancel iOS from web", () => {
        it("should fail and tell user to go to Apple", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.getUrl("/cancel-subscription", {
                receiptId: "some_receipt",
                receiptType: "ios"
              });
            })
            .then(response => {
              response.text.should.contain("Subscriptions made through the iOS app must be cancelled through Apple");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe.skip("Cancel Android from web", () => {
        it("should fail and tell user to go to Apple", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              return Client.getUrl("/cancel-subscription", {
                receiptId: "some_receipt",
                receiptType: "android"
              });
            })
            .then(response => {
              response.text.should.contain("Subscriptions made through the Android app must be cancelled through Google Play");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("POST /cancel-subscription", () => {

    describe("Success", () => {

      describe("Create and cancel Stripe subscription", () => {
        after(function () {
          Email.sendCancelSubscription.restore();
        });
        it("should have 0 active subscriptions at the end and also send cancellation email", (done) => {
          const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              var newSubscriptionId = response.body[0].receiptId;
              return Client.cancelSubscription(newSubscriptionId, "test");
            })
            .then(response => {
              //sinon.assert.calledOnce(spyEmailSendCancelSubscription);
              response.status.should.equal(200);
              response.text.should.contain("Subscription cancelled successfully");
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Create and cancel Stripe subscription with active iOS subscription", () => {
        after(function () {
          Email.sendCancelSubscription.restore();
          resetDate();
        });
        it("should not send cancellation email because there's an active iOS subscription", (done) => {
          const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
          Client.signupConfirmSignin()
            .then(response => {
              return addActiveIosSubscription();
            })
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.activeSubscriptions();
            })
            .then(response => {
              var newSubscriptionId = response.body[1].receiptId; // the second sub is the Stripe sub
              return Client.cancelSubscription(newSubscriptionId, "test");
            })
            .then(response => {
              sinon.assert.notCalled(spyEmailSendCancelSubscription);
              response.status.should.equal(200);
              response.text.should.contain("Subscription cancelled successfully");
              return Client.activeSubscriptions();
            })
            .then(response => {
              response.body.length.should.equal(1);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("not logged in", () => {
        it("should fail", (done) => {
          Client.cancelSubscription("some_receipt", "test")
            .end((error, response) => {
              response.should.have.status(401);
              response.body.message.should.contain("Session expired");
              done();
            });
        });
      });

      describe("invalid receipt", () => {
        it("should fail", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.cancelSubscription("nonexistent_receipt", "test");
            })
            .then(response => {
              response.body.code.should.equal(26);
              response.body.message.should.contain("no such subscription");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("cancel some other user's receipt", () => {
        it("should fail", (done) => {
          Client.signupConfirmSignin()
            .then(response => {
              return makeStripeSource(NEW_CARD_TOKEN);
            })
            .then(response => {
              return Client.newSubscription(response.id, false, "all-monthly")
                .redirects(0);
            })
            .then(response => {
              return Client.cancelSubscription(Constants.EXISTING_USER_STRIPE_RECEIPT_ID, "test");
            })
            .then(response => {
              response.body.code.should.equal(26);
              response.body.message.should.contain("no such subscription");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

});
const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const {
  reset,
  changeDate,
  resetDate
} = require("../utilities.js");

const {
  User
} = require("shared/models");
const {
  Certificate
} = require("shared/models");

describe("User Controller", () => {

  describe("GET /signup", () => {
    it("should respond with Sign Up page", (done) => {
      Client.getUrl("/signup")
        .end((error, response) => {
          response.should.have.status(200);
          response.text.should.contain("Sign Up");
          done();
        });
    });

    describe("referral parameter", () => {
      it("should respond with success", (done) => {
        Client.getUrl("/signup", {
            refer: Constants.EXISTING_USER_REFERRAL_CODE
          })
          .then(response => {
            response.text.should.contain("Referral Code Activated");
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

    describe("referral parameter - invalid code", () => {
      it("should respond with success", (done) => {
        Client.getUrl("/signup", {
            refer: "nonexistentCode"
          })
          .then(response => {
            response.text.should.contain("Referral code doesn't exist");
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

  });

  describe("GET /signup-success", () => {
    it("should respond with Sign Up Success page", (done) => {
      Client.getUrl("/signup-success")
        .end((error, response) => {
          response.should.have.status(200);
          response.text.should.contain("Check Your Email");
          done();
        });
    });
  });

  describe("POST /signup", () => {

    beforeEach(reset);

    describe("Success", () => {

      describe("Signup Through API", () => {
        it("should respond with success", (done) => {
          Client.signup()
            .then(response => {
              response.should.have.status(200);
              response.body.message.should.equal("Email Confirmation Sent");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Signup Through Browser", () => {
        it("should redirect to /signup-success", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD, true)
            .end((error, response) => {
              response.should.redirect;
              response.redirects[0].should.contain("/signup-success");
              done();
            });
        });
      });

      describe("Signup Through API With Referrer", () => {
        it("should respond with success", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD, false, Constants.EXISTING_USER_REFERRAL_CODE)
            .then(response => {
              response.should.have.status(200);
              response.body.message.should.equal("Email Confirmation Sent");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.referredBy.should.equal(Constants.EXISTING_USER_ID);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Signup Through Browser With Referrer", () => {
        it("should respond with success", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD, true, Constants.EXISTING_USER_REFERRAL_CODE)
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/signup-success");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.referredBy.should.equal(Constants.EXISTING_USER_ID);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("Confirmed Email Exists", () => {
        it("should fail", (done) => {
          Client.signup(Constants.EXISTING_USER_EMAIL, "somepassworD!11")
            .end((error, response) => {
              response.should.have.status(400);
              response.body.message.should.contain("That email is already registered");
              response.body.code.should.equal(40);
              done();
            });
        });
      });

      describe("Invalid Email", () => {
        it("should fail", (done) => {
          Client.signup("invalid_email", "somepassword")
            .end((error, response) => {
              response.should.have.status(400);
              response.body.message.should.contain("Invalid email address.");
              response.body.code.should.equal(3);
              done();
            });
        });
      });

      describe("Invalid Password - Too Short", () => {
        it("should fail", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, "short")
            .end((error, response) => {
              response.should.have.status(400);
              response.body.message.should.contain("at least 8 letters long");
              response.body.code.should.equal(3);
              done();
            });
        });
      });

      describe("Invalid Password - Missing Special Character", () => {
        it("should fail", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, "testPASS99")
            .end((error, response) => {
              response.should.have.status(400);
              response.body.message.should.contain("contain a special character");
              response.body.code.should.equal(3);
              done();
            });
        });
      });

      describe("Invalid Email & Password", () => {
        it("should fail", (done) => {
          Client.signup("invalid_email", "short")
            .end((error, response) => {
              response.should.have.status(400);
              response.body.message.should.contain("Invalid email address.");
              response.body.code.should.equal(3);
              done();
            });
        });
      });

      describe("Blank email & Password", () => {
        it("should fail", (done) => {
          Client.signup(null, null)
            .end((error, response) => {
              response.should.have.status(400);
              response.body.message.should.contain("Invalid email address.");
              response.body.code.should.equal(3);
              done();
            });
        });
      });

    });

  });

  describe("GET /confirm-email", () => {

    beforeEach(reset);

    describe("Success", () => {

      describe("Signup Through API, Then Confirm", () => {
        it("should have link to redirect to app and correctly confirm user in database, and should assign certificate", (done) => {
          Client.signup()
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(200);
              response.text.should.contain("tunnels://");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.email.should.equal(Constants.NEW_USER_EMAIL);
              user.emailEncrypted.should.not.equal(Constants.NEW_USER_EMAIL);
              user.emailConfirmed.should.equal(true);
              user.id.should.not.equal(null);
              return Certificate.getWithSourceAndUser(Constants.CURRENT_SOURCE_ID, user.id);
            })
            .then(certificate => {
              certificate.sourceId.should.equal(Constants.CURRENT_SOURCE_ID);
              certificate.userId.should.equal(Constants.NEW_USER_ID);
              certificate.revoked.should.equal(false);
              certificate.assigned.should.equal(true);
              certificate.p12.should.equal(Constants.NEW_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Signup Through Browser, Then Confirm", () => {
        it("should respond success and correctly confirm user in database, and should assign certificate", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD, true)
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode, true);
            })
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/signin?redirecturi=/new-subscription?browser=true");
              response.should.have.status(200);
              response.text.should.contain("Email confirmed. Please sign in.");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.email.should.equal(Constants.NEW_USER_EMAIL);
              user.emailEncrypted.should.not.equal(Constants.NEW_USER_EMAIL);
              user.emailConfirmed.should.equal(true);
              user.id.should.not.equal(null);
              return Certificate.getWithSourceAndUser(Constants.CURRENT_SOURCE_ID, user.id);
            })
            .then(certificate => {
              certificate.sourceId.should.equal(Constants.CURRENT_SOURCE_ID);
              certificate.userId.should.equal(Constants.NEW_USER_ID);
              certificate.revoked.should.equal(false);
              certificate.assigned.should.equal(true);
              certificate.p12.should.equal(Constants.NEW_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Underscore should count as a special character in password", () => {
        it("should respond success", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, "Hello1111_")
            .then(response => {
              response.should.have.status(200);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("Null/Blank/Wrong Confirmation Codes", () => {
        it("should fail", (done) => {
          Client.signup()
            .then(response => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, null);
            })
            .then(response => {
              response.should.have.status(400);
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              if (user.id != null) {
                throw Error("user should be null with bad confirm code");
              }
            })
            .then(response => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, "");
            })
            .then(response => {
              response.should.have.status(400);
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              if (user.id != null) {
                throw Error("user should be null with blank confirm code");
              }
            })
            .then(response => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, "WRONGCODE");
            })
            .then(response => {
              response.should.have.status(400);
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              if (user.id != null) {
                throw Error("user should be null with wrong confirm code");
              }
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Wrong Email", () => {
        it("should fail", (done) => {
          Client.signup()
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail("wrong@confirmedvpn.com", user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(400);
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              if (user.id != null) {
                throw Error("user should be null with wrong email");
              }
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Invalid Email", () => {
        it("should fail", (done) => {
          Client.signup()
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail("invalid)!(#($#@&(!)@()))@confirmedvpn.com", user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(400);
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(false);
              if (user.id != null) {
                throw Error("user should be null with invalid email");
              }
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("No special character in password", () => {
        it("should fail", (done) => {
          Client.signup(Constants.NEW_USER_EMAIL, "Hello1111")
            .then(response => {
              response.should.have.status(400);
              response.text.should.contain("Password must contain a special character");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("GET /resend-confirm-code", () => {

    describe("Resend Confirmation Email - Web", () => {
      it("should render HTML page", (done) => {
        Client.getUrl("/resend-confirm-code")
          .end((error, response) => {
            response.should.have.status(200);
            response.text.should.contain("Resend Confirmation?");
            done();
          });
      });
    });

  });

  describe("POST /resend-confirm-code", () => {

    beforeEach(reset);

    describe("Success", () => {

      describe("Valid Email, Exists in Database", () => {
        it("should redirect to /signin", (done) => {
          Client.signup()
            .then(success => {
              return Client.resendConfirmCode();
            })
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/signin");
              response.text.should.contain("Confirmation email re-sent.");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("Doesn't Exist in Database", () => {
        it("should fail", (done) => {
          Client.signup()
            .then(success => {
              return Client.resendConfirmCode("doesnt_exist_email@confirmedvpn.com");
            })
            .then(response => {
              response.status.should.equal(400);
              response.text.should.contain("No such email");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Already confirmed", () => {
        it("should say already confirmed", (done) => {
          Client.signup()
            .then(response => {
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              return Client.resendConfirmCode();
            })
            .then(response => {
              response.status.should.equal(400);
              response.text.should.contain("Email already confirmed");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("POST /convert-shadow-user", () => {

    beforeEach(reset);

    describe("Success", () => {

      describe("Convert iOS User", () => {
        it("should add confirmed email successfully", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(1);
              response.body.message.should.equal("Email Confirmation Sent");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(200);
              response.text.should.contain("Email confirmed.");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(true);
              user.email.should.equal(Constants.NEW_USER_EMAIL);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe.skip("Convert Android User", () => {
        it("should add confirmed email successfully", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(1);
              response.body.message.should.equal("Email Confirmation Sent");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(200);
              response.text.should.contain("Email confirmed.");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              user.emailConfirmed.should.equal(true);
              user.email.should.equal(Constants.NEW_USER_EMAIL);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe.skip("Email already taken", () => {
        it("converts an iOS receipt with an email, then tries to convert Android receipt with same email, should fail", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(1);
              response.body.message.should.equal("Email Confirmation Sent");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(200);
              response.text.should.contain("Email confirmed.");
              return Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID);
            })
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              response.should.have.status(400);
              response.body.message.should.contain("That email is already registered.");
              response.body.code.should.equal(40);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Already has confirmed email", () => {
        it("converts an iOS receipt, then tries to convert that same user again, should fail", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(1);
              response.body.message.should.equal("Email Confirmation Sent");
              return User.getWithEmail(Constants.NEW_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmEmail(Constants.NEW_USER_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(200);
              response.text.should.contain("Email confirmed.");
              return Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID);
            })
            .then(response => {
              return Client.convertShadowUser("test1@confirmedvpn.com", "Boop@223!");
            })
            .then(response => {
              response.body.message.should.contain("already has a confirmed email");
              response.body.code.should.equal(48);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Invalid Email", () => {
        it("should fail", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser("testInvalidEmail.bla", "testpass199");
            })
            .then(response => {
              response.should.have.status(400);
              response.body.message.should.contain("Invalid email address.");
              response.body.code.should.equal(3);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Invalid Password", () => {
        it("should fail", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser("testInvalidEmail@gmail.com", "short");
            })
            .then(response => {
              response.should.have.status(400);
              response.body.message.should.contain("at least 8 letters long");
              response.body.code.should.equal(3);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("GET /clients", () => {
    it("should respond with Clients page", (done) => {
      Client.getUrl("/clients")
        .end((error, response) => {
          response.should.have.status(200);
          response.text.should.contain("Download Client");
          done();
        });
    });
  });

  describe("POST /get-key", () => {

    beforeEach(reset);

    describe("Success", () => {

      describe("Valid iOS Receipt", () => {

        after(resetDate);

        it("should respond with new user id and base64 key", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              changeDate();
              return Client.getKey("ios");
            })
            .then(response => {
              response.should.have.status(200);
              response.body.id.should.equal(Constants.NEW_USER_ID);
              response.body.b64.should.equal(Constants.NEW_USER_P12);
              return Certificate.getWithSourceAndUser(Constants.CURRENT_SOURCE_ID, Constants.NEW_USER_ID);
            })
            .then(certificate => {
              certificate.sourceId.should.equal(Constants.CURRENT_SOURCE_ID);
              certificate.userId.should.equal(Constants.NEW_USER_ID);
              certificate.revoked.should.equal(false);
              certificate.assigned.should.equal(true);
              certificate.p12.should.equal(Constants.NEW_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe.skip("Valid Android Receipt", () => {

        after(resetDate);

        it("should respond with new user id and base64 key", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              changeDate();
              return Client.getKey("android");
            })
            .then(response => {
              response.should.have.status(200);
              response.body.id.should.equal(Constants.NEW_USER_ID);
              response.body.b64.should.equal(Constants.NEW_USER_P12);
              return Certificate.getWithSourceAndUser(Constants.CURRENT_SOURCE_ID, Constants.NEW_USER_ID);
            })
            .then(certificate => {
              certificate.sourceId.should.equal(Constants.CURRENT_SOURCE_ID);
              certificate.userId.should.equal(Constants.NEW_USER_ID);
              certificate.revoked.should.equal(false);
              certificate.assigned.should.equal(true);
              certificate.p12.should.equal(Constants.NEW_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Desktop - All Plan -> Windows", () => {
        it("should respond with user id and base64 key", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getKey("windows")
            })
            .then(response => {
              response.should.have.status(200);
              response.body.id.should.equal(Constants.EXISTING_USER_ID);
              response.body.b64.should.equal(Constants.EXISTING_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Desktop - All Plan -> Mac", () => {
        it("should respond with user id and base64 key", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getKey("mac")
            })
            .then(response => {
              response.should.have.status(200);
              response.body.id.should.equal(Constants.EXISTING_USER_ID);
              response.body.b64.should.equal(Constants.EXISTING_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Stripe - All Plan -> iOS", () => {
        it("should respond with user id and base64 key", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getKey("ios")
            })
            .then(response => {
              response.should.have.status(200);
              response.body.id.should.equal(Constants.EXISTING_USER_ID);
              response.body.b64.should.equal(Constants.EXISTING_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Stripe - All Plan -> Android", () => {
        it("should respond with user id and base64 key", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getKey("android")
            })
            .then(response => {
              response.should.have.status(200);
              response.body.id.should.equal(Constants.EXISTING_USER_ID);
              response.body.b64.should.equal(Constants.EXISTING_USER_P12);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe.skip("Get iOS with Android-only Receipt", () => {
        after(resetDate);
        it("should fail", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              changeDate();
              return Client.getKey("ios");
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(52);
              response.body.message.should.contain("doesn't have iOS");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe.skip("Get Mac with Android-only Receipt", () => {
        after(resetDate);
        it("should fail", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              changeDate();
              return Client.getKey("mac");
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(38);
              response.body.message.should.contain("doesn't have desktop subscription");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("No Cookie/Session", () => {
        it("should fail", (done) => {
          Client.getKey("android")
            .then(response => {
              response.should.have.status(401);
              response.text.should.contain("Session expired");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Expired iOS Receipt", () => {
        it("should fail", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.getKey("ios");
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(6);
              response.body.message.should.contain("No active subscriptions");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      // TODO: Expired Android Receipt

      // TODO: Expired Stripe Sub

      describe("Invalid Platform", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getKey("invalid");
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(3);
              response.body.message.should.contain("Unrecognized platform.");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

  });

  describe("GET /do-not-email", () => {

    describe("Do Not Email - Web", () => {
      it("should render HTML page", (done) => {
        Client.getUrl("/do-not-email", {
            email: Constants.EXISTING_USER_EMAIL,
            code: Constants.EXISTING_USER_DO_NOT_EMAIL_CODE
          })
          .end((error, response) => {
            response.should.have.status(200);
            response.text.should.contain(Constants.EXISTING_USER_EMAIL);
            response.text.should.contain(Constants.EXISTING_USER_DO_NOT_EMAIL_CODE);
            response.text.should.contain("Email Opt Out");
            done();
          });
      });
    });

  });

  describe("POST /do-not-email", () => {

    beforeEach(reset);

    describe("Success", () => {

      describe("Valid Email and Code", () => {
        it("should change do_not_email to true", (done) => {
          Client.doNotEmail(Constants.EXISTING_USER_EMAIL, Constants.EXISTING_USER_DO_NOT_EMAIL_CODE)
            .then(response => {
              response.text.should.contain("You will no longer receive any emails");
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              user.doNotEmail.should.equal(true);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {

      describe("Wrong code", () => {
        it("should fail", (done) => {
          Client.doNotEmail(Constants.EXISTING_USER_EMAIL, "wrongcode" + Constants.EXISTING_USER_DO_NOT_EMAIL_CODE)
            .then(response => {
              response.text.should.contain("Wrong code and/or email");
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              user.doNotEmail.should.equal(false);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

      describe("Wrong email", () => {
        it("should fail", (done) => {
          Client.doNotEmail("wrong" + Constants.EXISTING_USER_EMAIL, Constants.EXISTING_USER_DO_NOT_EMAIL_CODE)
            .then(response => {
              response.text.should.contain("Wrong code and/or email");
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              user.doNotEmail.should.equal(false);
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
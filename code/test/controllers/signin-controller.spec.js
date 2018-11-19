const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset } = require("../utilities.js");

describe("Signin Controller", () => {

  describe("GET /signin", () => {
    
    it("should show signin page", (done) => {
      Client.getUrl("/signin")
        .end((error, response) => {
          response.should.have.status(200);
          response.text.should.contain("Sign In");
          done();
        });
    });
    
  });

  describe("POST /signin", () => {
    
    beforeEach(reset);
    
    describe("Success", () => {
      
      describe("Signin With Email, API", () => {
        it("should succeed", (done) => {
          Client.signinWithEmail()
            .then(response => {
              response.should.have.status(200);
              response.body.message.should.equal("Signed In");
              response.body.code.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Email, Browser", () => {
        it("should succeed", (done) => {
          Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, Constants.EXISTING_USER_PASSWORD, true)
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/account");
              response.text.should.contain("Account");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With iOS Receipt", () => {
        it("should succeed", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              response.should.have.status(200);
              response.body.message.should.equal("Signed In");
              response.body.code.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Android Receipt", () => {
        it("should succeed", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_VALID)
            .then(response => {
              response.should.have.status(200);
              response.body.message.should.equal("Signed In");
              response.body.code.should.equal(0);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Email then Log Out, Browser", () => {
        it("should sign in, then sign out, then fail to access account page", (done) => {
          Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, Constants.EXISTING_USER_PASSWORD, true)
            .then(response => {
              response.text.should.contain("Account");
              return Client.logout();
            })
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/signin");
              response.text.should.contain("Sign In");
              return Client.getUrl("/account");
            })
            .then(response => {
              response.status.should.equal(401);
              response.text.should.contain("Session expired");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
    });
    
    describe("Failure", () => {
      
      describe("Signin With Unconfirmed Email, API", () => {
        it("should show unconfirmed message", (done) => {
          Client.signup()
            .then(response => {
              return Client.signinWithEmail(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD);
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(1);
              response.body.message.should.equal("Email Not Confirmed");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Unconfirmed Email, Browser", () => {
        it("should show unconfirmed message", (done) => {
          Client.signup()
            .then(response => {
              return Client.signinWithEmail(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD, true);
            })
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/resend-confirm-code");
              response.text.should.contain("Resend");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("No such user, API", () => {
        it("should fail", (done) => {
          Client.signinWithEmail("nosuchuser@confirmedvpn.com", Constants.EXISTING_USER_PASSWORD)
            .then(response => {
              response.should.have.status(401);
              response.body.message.should.contain("Incorrect Login");
              response.body.code.should.equal(2);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("No such user, Browser", () => {
        it("should fail", (done) => {
          Client.signinWithEmail("nosuchuser@confirmedvpn.com", Constants.EXISTING_USER_PASSWORD, true)
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/signin");
              response.text.should.contain("Incorrect Login");
              response.text.should.contain("Sign In");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Wrong Password, API", () => {
        it("should fail", (done) => {
          Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, "WrongPassword")
            .then(response => {
              response.should.have.status(401);
              response.body.code.should.equal(2);
              response.body.message.should.contain("Incorrect Login");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Wrong Password, Browser", () => {
        it("should fail", (done) => {
          Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, "WrongPassword", true)
            .then(response => {
              response.should.redirect;
              response.redirects[0].should.contain("/signin");
              response.text.should.contain("Incorrect Login");
              response.text.should.contain("Sign In");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Bad iOS Receipt", () => {
        it("should fail", (done) => {
          Client.signinWithReceipt("ios", "AAFFBAAAAAAAABBBBBBB" + Constants.IOS_RECEIPT_VALID + "AAFFBAAAAAAAABBBBBBB")
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(10);
              response.body.message.should.contain("Error on response from Apple");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Invalid Android Receipt - Signature Mismatch", () => {
        it("should fail", (done) => {
          Client.signinWithReceipt("android", Constants.ANDROID_RECEIPT_INVALID)
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(63);
              response.text.should.contain("Android receipt does not match its signature");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Signin With Nothing", () => {
        it("should fail", (done) => {
          Client.postUrl("/signin", null)
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(3);
              response.body.message.should.equal("Missing email address.");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
    });
  
  });

  describe("GET /logout", () => {
    
    it("should log in, then log out, then should get 401", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/logout")
        })
        .then(response => {
          return Client.getUrl("/account")
        })
        .then(response => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
    it("should log out even though not logged in", (done) => {
      Client.getUrl("/logout")
        .then(response => {
          response.should.redirect;
          response.redirects[0].should.contain("/signin");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });

});
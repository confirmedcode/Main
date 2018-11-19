const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset, getCsrfToken } = require("../utilities.js");

const { User } = require("shared/models");
const { Stripe } = require("shared/utilities");

const CHANGED_EMAIL = "test_new@confirmedvpn.com";
const NEW_PASSWORD = "newpa123%$12D";
const NEW_CARD_SOURCE = "tok_amex";
const ORIGINAL_DEFAULT_STRIPE_CARD_ID = "card_1DSBBXEfDv8YQARy1vNE6fRR";

describe("Account Controller", () => {
  
  beforeEach(reset);
  
  describe("GET /account", () => {
    
    it("not logged in, should redirect to sign-up", (done) => {
      Client.getUrl("/account")
        .end((error, response) => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        });
    });
    
    it("logged in, should show account page", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/account")
        })
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("Account");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
  describe("GET /change-email", () => {
    
    it("not logged in, should redirect to sign-up", (done) => {
      Client.getUrl("/change-email")
        .end((error, response) => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        });
    });
    
    it("logged in, should show change email page with csrf token", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/change-email")
        })
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("_csrf");
          response.text.should.contain("Change Email");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
  describe("POST /change-email & GET /confirm-change-email", () => {

    describe("Success", () => {

      describe("Change email success", () => {
        it("should change email and allow new email login", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              response.text.should.contain("A confirmation has been sent to your new email");
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmChangeEmail(CHANGED_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.text.should.contain("Email change confirmed");
              return Client.signinWithEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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

    });

    describe("Failure", () => {
      
      describe("Change with wrong CSRF token", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, "wrongtoken");
            })
            .then(response => {
              response.text.should.contain("invalid csrf token");
              return Client.signinWithEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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
      
      describe("Change with no CSRF token", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, undefined);
            })
            .then(response => {
              response.text.should.contain("invalid csrf token");
              return Client.signinWithEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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
      
      describe("Change with wrong password", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD + "wrong", getCsrfToken(response));
            })
            .then(response => {
              response.text.should.contain("Incorrect password");
              return Client.signinWithEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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
      
      describe("Change with no password", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, undefined, getCsrfToken(response));
            })
            .then(response => {
              response.text.should.contain("Missing password");
              return Client.signinWithEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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
      
      describe("Change without session", () => {
        it("should fail", (done) => {
          Client.changeEmail(CHANGED_EMAIL)
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
      
      describe("Change email of iOS user that doesn't have a confirmed email", () => {
        it("should fail", (done) => {
          Client.signinWithReceipt("ios", Constants.IOS_RECEIPT_VALID)
            .then(response => {
              return Client.convertShadowUser();
            })
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.NEW_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(110);
              response.body.message.should.contain("Can't change email on user without confirmed email");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      })
      
      describe("Log in and change email on account where first email is not confirmed", () => {
        it("should fail", (done) => {
          Client.signup()
            .then(response => {
              return Client.signinWithEmail(Constants.NEW_USER_EMAIL, Constants.NEW_USER_PASSWORD)
            })
            .then(response => {
              response.should.have.status(200);
              response.body.code.should.equal(1);
              response.body.message.should.equal("Email Not Confirmed");
              return Client.changeEmail(CHANGED_EMAIL)
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
      });
      
      describe("Log in with Old Email", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmChangeEmail(CHANGED_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              return Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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
      
      describe("Try to change twice with same code", () => {
        it("should fail", (done) => {
          var code = "";
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              code = user.emailConfirmCode;
              return Client.confirmChangeEmail(CHANGED_EMAIL, code);
            })
            .then(response => {
              return Client.confirmChangeEmail("second_" + CHANGED_EMAIL, code);
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(18);
              response.body.message.should.contain("not found");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Change with different email than originally requested", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmChangeEmail("different_" + CHANGED_EMAIL, user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(18);
              response.body.message.should.contain("not found");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Invalid email on change-email", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL +  "*(@#$@989)INVALIDEMAIL", Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(3);
              response.body.message.should.contain("Invalid email");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Invalid email on confirm-change-email", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              return Client.confirmChangeEmail(CHANGED_EMAIL + "*^^||(@#$@989)INVALIDEMAIL", user.emailConfirmCode);
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(3);
              response.body.message.should.contain("Invalid email");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Wrong code", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-email");
            })
            .then(response => {
              return Client.changeEmail(CHANGED_EMAIL, Constants.EXISTING_USER_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              return Client.confirmChangeEmail(CHANGED_EMAIL, "*");
            })
            .then(response => {
              response.should.have.status(400);
              response.body.code.should.equal(3);
              response.body.message.should.contain("Invalid confirmation code");
              done();
            })
            .catch(error => {
              done(error);
            });
          });
      });
      
    });

  });
  
  describe("GET /change-password", () => {
    
    it("not logged in, should redirect to sign-up", (done) => {
      Client.getUrl("/change-password")
        .end((error, response) => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        });
    });
    
    it("logged in, should show change password page with csrf token", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/change-password")
        })
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("_csrf");
          response.text.should.contain("Change Password");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
  describe("POST /change-password", () => {
    
    describe("Success", () => {

      describe("Change password success", () => {
        it("should change password and allow new password", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-password");
            })
            .then(response => {
              return Client.changePassword(Constants.EXISTING_USER_PASSWORD, NEW_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              response.text.should.contain("Password changed successfully");
              return Client.logout();
            })
            .then(response => {
              return Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, NEW_PASSWORD);
            })
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

    });

    describe("Failure", () => {
      
      describe("Change without session", () => {
        it("should fail", (done) => {
          Client.changePassword(Constants.EXISTING_USER_PASSWORD, NEW_PASSWORD)
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
      
      describe("Log in with Old Password", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-password");
            })
            .then(response => {
              return Client.changePassword(Constants.EXISTING_USER_PASSWORD, NEW_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              response.text.should.contain("Password changed successfully");
              return Client.logout();
            })
            .then(response => {
              return Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, Constants.EXISTING_USER_PASSWORD);
            })
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
      
      describe("Wrong Current Password", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-password");
            })
            .then(response => {
              return Client.changePassword("WrongCurrentPassword", NEW_PASSWORD, getCsrfToken(response));
            })
            .then(response => {
              response.body.message.should.contain("Current password is incorrect.");
              response.body.code.should.equal(3);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("New Password Too Short", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.getUrl("/change-password");
            })
            .then(response => {
              return Client.changePassword(Constants.EXISTING_USER_PASSWORD, "short", getCsrfToken(response));
            })
            .then(response => {
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

  describe("GET /invoices", () => {
    
    it("not logged in, should redirect to sign-up", (done) => {
      Client.getUrl("/invoices")
        .end((error, response) => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        });
    });
    
    it("logged in, should show invoices page", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/invoices")
        })
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("Invoices");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
  describe("GET /payment-methods", () => {
    
    it("not logged in, should redirect to signin", (done) => {
      Client.getUrl("/payment-methods")
        .end((error, response) => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        });
    });
    
    it("logged in, should show payment methods page with test card", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/payment-methods")
        })
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("Payment Methods");
          response.text.should.contain("4242");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
  describe("GET /add-new-card", () => {
  
    it("not logged in, should redirect to signin", (done) => {
      Client.getUrl("/add-new-card")
        .end((error, response) => {
          response.should.have.status(401);
          response.body.message.should.contain("Session expired");
          done();
        });
    });
    
    it("logged in, should show add new card page", (done) => {
      Client.signinWithEmail()
        .then(response => {
          return Client.getUrl("/add-new-card")
        })
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("Add New");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
  describe("POST /add-new-card", () => {
    
    describe("Success", () => {

      before(resetUserCards);
    
      afterEach(resetUserCards);
    
      describe("Add new card success", () => {
        it("should add the new card", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.addNewCard(NEW_CARD_SOURCE);
            })
            .then(response => {
              response.text.should.contain("Card added successfully");
              return Client.getUrl("/payment-methods")
            })
            .then(response => {
              response.should.have.status(200);
              response.text.should.contain("Payment Methods");
              response.text.should.contain("American Express");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });

    describe("Failure", () => {
      
      describe("No source", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.addNewCard(null);
            })
            .then(response => {
              response.statusCode.should.equal(400);
              response.text.should.contain("Missing source");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Invalid source", () => {
        it("should fail", (done) => {
          Client.signinWithEmail()
            .then(response => {
              return Client.addNewCard("INVALID SOURCE");
            })
            .then(response => {
              response.statusCode.should.equal(400);
              response.text.should.contain("Error adding card");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
    });
        
  });
  
  describe("POST /set-default-card", () => {
    
    before(resetUserCards);
  
    afterEach(resetUserCards);
    
    describe("set default card success", () => {
      it("should add new card, then set it as default", (done) => {
        var newCardId = "";
        Client.signinWithEmail()
          .then(response => {
            return Client.addNewCard(NEW_CARD_SOURCE);
          })
          .then(response => {
            return Stripe.getPaymentMethods(Constants.EXISTING_USER_STRIPE_ID);
          })
          .then(methods => {
            for (let method of methods) {
              if (method.id != ORIGINAL_DEFAULT_STRIPE_CARD_ID) {
                newCardId = method.id;
                return Client.setDefaultCard(method.id);
              }
            }
            throw Error("Didn't find new card.");
          })
          .then(response => {
            response.should.have.status(200);
            response.text.should.contain("New default set successfully");
            return Stripe.getPaymentMethods(Constants.EXISTING_USER_STRIPE_ID);
          })
          .then(methods => {
            for (let method of methods) {
              if (method.id == newCardId) {
                if ( method.is_default != true) {
                  throw Error("default card not set correctly");
                }
                else {
                  done();
                }
              }
            }
          })
          .catch(error => {
            done(error);
          });

      });
    });

  });
  
  describe("POST /delete-card", () => {

    before(resetUserCards);

    afterEach(resetUserCards);
    
    describe("Delete card success", () => {
      it("should add new card and delete it", (done) => {
        Client.signinWithEmail()
          .then(response => {
            return Client.addNewCard(NEW_CARD_SOURCE);
          })
          .then(response => {
            return Stripe.getPaymentMethods(Constants.EXISTING_USER_STRIPE_ID);
          })
          .then(methods => {
            for (let method of methods) {
              if (method.id != ORIGINAL_DEFAULT_STRIPE_CARD_ID) {
                newCardId = method.id;
                return Client.deleteCard(method.id);
              }
            }
            throw Error("Didn't find new card.");
          })
          .then(response => {
            response.should.have.status(200);
            response.body.message.should.equal("Card deleted successfully");
            return Stripe.getPaymentMethods(Constants.EXISTING_USER_STRIPE_ID);
          })
          .then(methods => {
            if (methods.length > 1) {
              throw Error("More than 1 card on account: ${methods.length}");
            }
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
  });
  
});

function resetUserCards(stripeId = Constants.EXISTING_USER_STRIPE_ID) {
  // Get all user's cards and delete all except the original one, which we set as default
  return Stripe.getPaymentMethods(stripeId)
    .then(methods => {
      var p = Promise.resolve();
      // Set original card as default
      p = p.then( () => {
        return Stripe.setDefaultSource(stripeId, ORIGINAL_DEFAULT_STRIPE_CARD_ID);
      });
      // Delete all others
      for (let method of methods) {
        if (method.id != ORIGINAL_DEFAULT_STRIPE_CARD_ID) {
          p = p.then( () => {
            return Stripe.deleteSource(stripeId, method.id);
          });
        }
      }
      return p;
    });
}
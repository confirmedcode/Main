const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset } = require("../utilities.js");

const { User } = require("shared/models");

const NEW_PASSWORD = "newP1299#@@@1";

describe("Reset Password Controller", () => {
  
  beforeEach(reset);
  
  describe("GET /forgot-password", () => {
    it("should show forgot password page", (done) => {
      Client.getUrl("/forgot-password")
        .then(response => {
          response.should.have.status(200);
          response.text.should.contain("Forgot Password");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });

  describe("POST /forgot-password", () => {

    describe("Success", () => {

      describe("Successfully submit request", () => {
        it("should respond with success and add a password reset code", (done) => {
          Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
            .then(response => {
              response.text.should.contain("If there is an account");
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              user.passwordResetCode.should.not.equal(null);
              user.passwordResetCode.should.not.equal("");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });

    });
    
    describe("Failure", () => {
      describe("Invalid email on forgot-password", () => {
        it("should fail", (done) => {
          Client.forgotPassword("InvalidEmail")
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
    });
    
  });
  
  describe("GET /reset-password", () => {
    
    describe("Success", () => {
      it("should show reset password page", (done) => {
        Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
          .then(response => {
            return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
          })
          .then(user => {
            return Client.getUrl("/reset-password", {
              code: user.passwordResetCode
            });
          })
          .then(response => {
            response.text.should.contain("Reset Password");
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
    describe("Failure", () => {
      it("should fail with empty code", (done) => {
        Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
          .then(response => {
            return Client.getUrl("/reset-password", {
              code: null
            });
          })
          .then(response => {
            response.body.code.should.equal(3);
            response.body.message.should.contain("Missing reset code.");
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
  });

  describe("POST /reset-password", () => {
    
    describe("Success", () => {
      it("should reset the user password", (done) => {
        Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
          .then(response => {
            return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
          })
          .then(user => {
            return Client.resetPassword(user.passwordResetCode, NEW_PASSWORD);
          })
          .then(response => {
            response.text.should.contain("New password set successfully");
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
    
    describe("Failure", () => {
      
      describe("Empty Code", () => {
        it("should fail", (done) => {
          Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
            .then(response => {
              return Client.resetPassword(null, NEW_PASSWORD);
            })
            .then(response => {
              response.text.should.contain("Missing reset code");
              return Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, NEW_PASSWORD);
            })
            .then(response => {
              response.should.have.status(401);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Wrong Code", () => {
        it("should fail", (done) => {
          Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
            .then(response => {
              return Client.resetPassword("11111111112222222222333333333344", NEW_PASSWORD);
            })
            .then(response => {
              response.body.code.should.equal(77);
              response.body.message.should.contain("Invalid reset code");
              return Client.signinWithEmail(Constants.EXISTING_USER_EMAIL, NEW_PASSWORD);
            })
            .then(response => {
              response.should.have.status(401);
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("Use same code twice", () => {
        it("should fail", (done) => {
          var resetCode = "";
          Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
            .then(response => {
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              resetCode = user.passwordResetCode;
              return Client.resetPassword(resetCode, NEW_PASSWORD);
            })
            .then(response => {
              return Client.logout();
            })
            .then(response => {
              return Client.resetPassword(resetCode, NEW_PASSWORD + "2");
            })
            .then(response => {
              response.body.code.should.equal(77);
              response.body.message.should.contain("Invalid reset code");
              done();
            })
            .catch(error => {
              done(error);
            });
        });
      });
      
      describe("New password too short", () => {
        it("should fail", (done) => {
          Client.forgotPassword(Constants.EXISTING_USER_EMAIL)
            .then(response => {
              return User.getWithEmail(Constants.EXISTING_USER_EMAIL);
            })
            .then(user => {
              return Client.resetPassword(user.passwordResetCode, "short");
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
  
});
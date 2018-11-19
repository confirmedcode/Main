// Chai + Server (Server must be loaded before other utilities)
const chai = require("chai");
chai.use(require("chai-http"));
const server = require("../app");
const Constants = require('./constants.js');
const { reset, changeDate, resetDate } = require("./utilities.js");

const { User } = require("shared/models");
const { Secure } = require("shared/utilities");

// describe.only("Skip All", () => {
//   it("should skip all tests", (done) => {
//     done();
//     return;
//   });
// });

// describe.only("Just Reset", () => {
//   beforeEach(reset);
//   it("should reset", (done) => {
//     done();
//     return;
//   });
// });

describe("Basic", () => {
  
  describe("Get user email", () => {
    beforeEach(reset);
    it("should respond with correct user email", (done) => {
      User.getWithEmail(Constants.EXISTING_USER_EMAIL)
        .then(user => {
          user.email.should.equal(Constants.EXISTING_USER_EMAIL);
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });

  describe("AES Encryption", () => {
    it("decrypted text should equal text", (done) => {
      const key = Secure.randomString(32);
      const encrypted = Secure.aesEncrypt("testDecryption@blah.com", key);
      Secure.aesDecrypt(encrypted, key).should.equal("testDecryption@blah.com");
      done();
    });
  });

  describe("Health Check", () => {
    it("should respond 200 and JSON OK", (done) => {
      chai.request(server)
        .get("/health")
        .end((error, response) => {
          response.should.have.status(200);
          response.body.message.should.contain("OK from");
          done();
        });
    });
  });
  
  describe("Get IP", () => {
    it("should get an IP", (done) => {
      chai.request(server)
        .get("/ip")
        .end((error, response) => {
          response.should.have.status(200);
          response.body.ip.should.exist;
          done();
        });
    });
  });
  
  describe("Get IP with Trust Proxy Header", () => {
    it("should get the passed in IP", (done) => {
      chai.request(server)
        .get("/ip")
        .set('X-Forwarded-For', '123.45.67.89, 9.9.9.9, 111.111.111.111')
        .end((error, response) => {
          response.should.have.status(200);
          response.body.ip.should.equal("123.45.67.89");
          done();
        });
    });
  });

  describe("404 Not Found", () => {
    it("should respond 404", (done) => {
      chai.request(server)
        .get("/invalid-url")
        .end((error, response) => {
          response.should.have.status(404);
          response.body.message.should.contain("Not Found");
          done();
        });
    });
  });

  describe("404 Not Found - Browser", () => {
    it("should respond 404", (done) => {
      chai.request(server)
        .get("/invalid-url")
        .set("Accept", "text/html")
        .end((error, response) => {
          response.should.have.status(404);
          response.text.should.contain("does not exist");
          done();
        });
    });
  });

  describe("Force a 500 Error - Browser", () => {
    it("should not expose error details to client", (done) => {
      chai.request(server)
        .get("/error-test")
        .set("Accept", "text/html")
        .end((error, response) => {
          response.text.should.contain("Unknown");
          done();
        });
    });
  });

  describe("Force a 500 Error", () => {
    it("should not expose error details to client", (done) => {
      chai.request(server)
        .get("/error-test")
        .end((error, response) => {
          response.should.have.status(500);
          response.body.code.should.equal(-1);
          done();
        });
    });
  });

});
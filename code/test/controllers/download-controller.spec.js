const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset } = require("../utilities.js");

describe("Download Controller", () => {
  
  beforeEach(reset);
  
  describe("GET /download-mac-app", () => {
    it("should succeed", (done) => {
      Client.getUrl("/download-mac-app")
        .redirects(0)
        .then(response => {
          response.text.should.contain("Redirecting to https://s3.amazonaws.com/");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
  
  describe("GET /download-mac-update", () => {
    it("should succeed", (done) => {
      Client.getUrl("/download-mac-update")
        .redirects(0)
        .then(response => {
          response.text.should.contain("Redirecting to https://s3.amazonaws.com/");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
  
  describe("GET /download-windows-app", () => {
    it("should succeed", (done) => {
      Client.getUrl("/download-windows-app")
        .redirects(0)
        .then(response => {
          response.text.should.contain("Redirecting to https://s3.amazonaws.com/");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
  
  describe("GET /download-windows-update", () => {
    it("should succeed", (done) => {
      Client.getUrl("/download-windows-update")
        .redirects(0)
        .then(response => {
          response.text.should.contain("Redirecting to https://s3.amazonaws.com/");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
  
  describe("GET /download-speed-test", () => {
    it("should return with bucket name", (done) => {
      Client.getUrl("/download-speed-test")
        .then(response => {
          response.body.bucket.should.equal("test-confirmedvpn-speedtest");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
  
});
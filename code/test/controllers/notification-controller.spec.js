const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset } = require("../utilities.js");

describe("Notification Controller", () => {
  
  describe("GET /notification", () => {
    it("should succeed", (done) => {
      Client.getUrl("/notification")
        .then(response => {
          response.text.should.contain("Notification");
          done();
        })
        .catch(error => {
          done(error);
        });
    });
  });
  
});
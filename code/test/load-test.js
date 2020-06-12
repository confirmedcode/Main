// Chai + Server (Server must be loaded before other utilities)
const chai = require("chai");
chai.use(require("chai-http"));
const server = require("../app");
const Constants = require('./constants.js');
const { reset, addCertificatesBatchNonWorking } = require("./utilities.js");

const Client = require("./client.js");
const { Secure } = require("shared/utilities");
  
// For local environment only
// describe.skip("Load Testing", () => {
//
//   beforeEach(reset);
//
//   describe("Users", () => {
//     it("should generate users", (done) => {
//       let NUM_USERS = 50000;
//
//       let chain = Promise.resolve();
//       let count = 0;
//       chain = chain
//         .then(() => {
//           return addCertificatesBatchNonWorking(NUM_USERS)
//         })
//       for (var i = 0; i < NUM_USERS; i++) {
//         chain = chain
//           .then(() => {
//             count = count + 1;
//             var email = `success+${count}@simulator.amazonses.com`
//             console.log("Generating user " + email);
//             return Client.signupConfirm(email, "TestPass!123", null, null, true)
//           })
//       }
//       chain = chain.then(() => {
//         done();
//       })
//       .catch( error => {
//         done(error);
//       })
//     });
//   });
//
// });
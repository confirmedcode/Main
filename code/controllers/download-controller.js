const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Models
const { ClientFile } = require("shared/models");

const { BruteForce } = require("shared/redis");

const SPEED_TEST_BUCKET = process.env.SPEED_TEST_BUCKET;

// Routes
const router = require("express").Router();

router.get("/download-mac-app",
BruteForce(100),
(request, response, next) => {	
  return ClientFile.getUrl("mac-app")
  .then(url => {
    response.redirect(url);
  })
  .catch( error => { next(error); });
});

router.get("/download-mac-update",
BruteForce(800),
(request, response, next) => {	
  return ClientFile.getUrl("mac-update")
  .then(url => {
    response.redirect(url);
  })
  .catch( error => { next(error); });
});

router.get("/download-windows-app",
BruteForce(100),
(request, response, next) => {	
  return ClientFile.getUrl("windows-app")
  .then(url => {
    response.redirect(url);
  })
  .catch( error => { next(error); });
});

router.get("/download-windows-update",
BruteForce(800),
(request, response, next) => {	
  return ClientFile.getUrl("windows-update")
  .then(url => {
    response.redirect(url);
  })
  .catch( error => { next(error); });
});

router.get("/download-speed-test",
(request, response, next) => {	
  return response.status(200).json({
    bucket: SPEED_TEST_BUCKET
  });
});

module.exports = router;
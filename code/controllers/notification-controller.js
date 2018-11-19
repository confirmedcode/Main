const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Show Notification
 *
 *********************************************/

router.get("/notification",
(request, response, next) => {	
  response.render("notification");
});

module.exports = router;
const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const { body, query, check } = require("express-validator/check");
const validateCheck = require("../middleware/validate-check.js");
const passwordRules = require("../middleware/password-rules.js");
const { BruteForce } = require("shared/redis");

// Models
const { User } = require("shared/models");

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Forgot Password - Send Reset Email
 *
 *********************************************/

router.get("/forgot-password",
(request, response, next) => {	
  response.render("forgot-password");
});
  
router.post("/forgot-password",
[
  BruteForce(20),
  body("email")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),
  validateCheck
],
(request, response, next) => {
  const email = request.values.email;
  User.generatePasswordReset(email)
    .then( result => {
      request.flashRedirect("info", "If there is an account associated with that email, a password reset email will be sent to it.", "/signin");
    })
    .catch(error => { next(error); });
});

/*********************************************
 *
 * Reset Password - Actually Reset Password
 *
 *********************************************/

router.get("/reset-password",
[
  BruteForce(20),
  query("code")
    .exists().withMessage("Missing reset code.")
    .not().isEmpty().withMessage("Missing reset code.")
    .isLength({ min: 32, max: 32 }).withMessage("Invalid reset code.")
    .isAlphanumeric().withMessage("Invalid reset code.")
    .trim(),
  validateCheck
],
(request, response, next) => {
  const code = request.values.code;
  response.render("reset-password", {
    code: code
  });
});

router.post("/reset-password",
[
  BruteForce(20),
  check("code")
    .exists().withMessage("Missing reset code.")
    .not().isEmpty().withMessage("Missing reset code.")
    .isLength({ min: 32, max: 32 }).withMessage("Invalid reset code.")
    .isAlphanumeric().withMessage("Invalid reset code.")
    .trim(),
  body("newPassword")
    .exists().withMessage("Missing new password.")
    .not().isEmpty().withMessage("Missing new password.")
    .custom(value => {
      passwordRules(value);
      return value;
    }),
  validateCheck
],
(request, response, next) => {
  const code = request.values.code;
  const newPassword = request.values.newPassword;
  User.resetPassword(code, newPassword)
    .then( success => {
      request.flashRedirect("success", "New password set successfully.", "/signin");
    })
    .catch(error => { next(error); });
});

module.exports = router;
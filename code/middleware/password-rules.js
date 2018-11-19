const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

const PASSWORD_RULES = {
  minimumLength: 8,
  requireCapital: true,
  requireLower: true,
  requireNumber: true,
  requireSpecial: true
};

const rules = require("password-rules");

module.exports = (value) => {
  let result = rules(value, PASSWORD_RULES);
  if (result !== false) {
    throw new Error(result.sentence);
  };
};

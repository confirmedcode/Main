const Logger = require("shared/logger");

// Load environment variables
require("shared/environment")([
  "COMMON",
  "MAIN"
]);

// Load database login
process.env.PG_USER = "main";
process.env.PG_PASSWORD = process.env.PG_MAIN_PASSWORD;
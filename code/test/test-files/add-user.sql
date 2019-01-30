INSERT INTO users
(
  "id",
  "email",
  "email_encrypted",
  "password",
  "stripe_id",
  "email_confirmed",
  "email_confirm_code",
  "change_email",
  "password_reset_code",
  "month_usage_megabytes",
  "month_usage_update",
  "referral_code",
  "referred_by",
  "partner_campaign",
  "create_date",
  "delete_date",
  "delete_reason",
  "banned",
  "do_not_email",
  "do_not_email_code"
)
VALUES
(
  'd3a8ddd867329cae2fc803b4e45abab4',
  'afa63d7399446f19ae65fd3bd777214370e91b62435ee90f8e4b3b105cd0dbe02cffd2f09b78caa6d58ccfaf89ce4dc6175aaee62a75bb0014c03bc040b6c7c3',
  '05b3d2cc3fdb2d56cef9b117e8c2f27d10f9a58ab800c5bba4770163f62d02a150b27a512bbefba0fe51ead5b0f7ae50',
  '$2b$10$evCGqxEMHraXsCEl..LcYeNzncC4txYhFGZM4LnlVnG.GC76ulE8u',
  'cus_Dtz9Dji9xkqCWV',
  TRUE,
  '9d2b021b0529d9911419bfdc8b4c5431',
  NULL,
  NULL,
  0,
  '2018-09-21 21:00:34.02969+02',
  '38945FDBE',
  NULL,
  NULL,
  '2018-08-21 21:00:34.02969+02',
  NULL,
  NULL,
  FALSE,
  FALSE,
  '12C3AEA1E6D5CE80FC1'
)
RETURNING *;
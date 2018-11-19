INSERT INTO subscriptions
(
  "user_id",
  "receipt_id",
  "receipt_type",
  "plan_type",
  "expiration_date",
  "cancellation_date",
  "receipt_data",
  "in_trial",
  "failed_last_check",
  "renew_enabled",
  "updated"
)
VALUES
(
  'd3a8ddd867329cae2fc803b4e45abab4',
  'sub_Dtz9JXEc4atQzU',
  'stripe',
  'all-annual',
  '2040-10-05 22:53:29+02',
  NULL,
  'ef3bc28b117cd9d4',
  FALSE,
  FALSE,
  TRUE,
  '2018-09-25 22:53:31.202802+02'
)
RETURNING *;
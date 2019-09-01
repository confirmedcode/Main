# Main Server

This is a public Node.js Express server that hosts the API and website. It does all the client-facing non-VPN functionality like creating accounts, managing subscriptions, and hosting client certificates.

- [Prerequisites](#prerequisites)
- [Authentication](#authentication)
  * [Sign In With Email/Password](#sign-in-with-email-password)
  * [Sign In With IAP Receipt](#sign-in-with-iap-receipt)
  * [Log Out (Delete Session)](#log-out--delete-session-)
- [Signup](#signup)
  * [IAP Signup](#iap-signup)
  * [Email Signup - Web](#email-signup---web)
  * [Email Signup](#email-signup)
  * [Email Signup Success - Web](#email-signup-success---web)
  * [Confirm Email](#confirm-email)
  * [Resend Confirmation Email - Web](#resend-confirmation-email---web)
  * [Resend Confirmation Email](#resend-confirmation-email)
  * [Add Email/Password to IAP-Created User](#add-email-password-to-iap-created-user)
- [Download App](#download-app)
  * [Webpage With Links to Apps](#webpage-with-links-to-apps)
  * [Download Mac App](#download-mac-app)
  * [Download Mac Update](#download-mac-update)
  * [Download Windows App](#download-windows-app)
  * [Download Windows Update](#download-windows-update)
- [Get User Certificate/Key](#get-user-certificate-key)
- [Account Management](#account-management)
  * [Account - Web](#account---web)
  * [Change Email - Web](#change-email---web)
  * [Change Email](#change-email)
  * [Change Password - Web](#change-password---web)
  * [Change Password](#change-password)
  * [Invoice History - Web](#invoice-history---web)
  * [Get Invoice - Web](#get-invoice---web)
  * [Payment Methods - Web](#payment-methods---web)
  * [New Payment Method - Web](#new-payment-method---web)
  * [New Payment Method](#new-payment-method)
  * [Set Default Payment Method](#set-default-payment-method)
  * [Delete Payment Method](#delete-payment-method)
  * [Email Opt Out - Web](#email-opt-out---web)
  * [Email Opt Out](#email-opt-out)
- [Reset Password](#reset-password)
  * [Request Reset Password - Web](#request-reset-password---web)
  * [Request Reset Password](#request-reset-password)
  * [Reset Password - Web](#reset-password---web)
  * [Reset Password](#reset-password-1)
- [Subscription Management](#subscription-management)
  * [Get Subscriptions](#get-subscriptions)
  * [Get Active Subscriptions](#get-active-subscriptions)
  * [New Pro Subscription - Web](#new-pro-subscription---web)
  * [New Pro Subscription](#new-pro-subscription)
  * [Cancel Subscription - Web](#cancel-subscription---web)
  * [Cancel Pro Subscription](#cancel-pro-subscription)
- [Diagnostic/Other APIs](#diagnostic-apis)
  * [Test Error Logging](#test-error-logging)
  * [Health Check](#health-check)
  * [Get Current IP](#get-current-ip)
  * [Speed Test Bucket](#speed-test-bucket)
- [Error Responses](#error-responses)
  * [Response Format](#response-format)
  * [Too Many Requests](#too-many-requests)
  * [Error Reference](#error-reference)
- [Support](#support)

## Prerequisites

* Run the Main [CloudFormation](https://github.com/confirmedcode/Server-CloudFormation) and all its prerequisites
* Initialize the database with Admin Server
* Creating and setting a `CURRENT_SOURCE_ID` with Admin Server


## Authentication
`Requires Authentication` calls, require a session cookie from the `POST /signin` endpoint, which takes either email/password or IAP receipt. If you sign in with a new IAP receipt, a user will be created if that receipt has not been used before.

If a session cookie expires or server returns 401, request a new cookie with `/signin`.

### Sign In With Email/Password
__Request__

```
POST /signin
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ User email.
`password` | `string` | __Required__ User password.

__Response__

```
Set-Cookie: <Cookie with Expiration Time>
```

### Sign In With IAP Receipt
If you sign in with a new IAP receipt, a user will be created if that receipt has not been used before.

__Request__

```
POST /signin
```

Name | Type | Description
--- | --- | ---
`authtype` | `string` | __Required__ Must be either `ios` or `android`.
`authreceipt` | `string` | __Required__ Base64 encoded IAP receipt.
`partner` | `string` | Partner campaign for affiliate referrals. Format is `[Partner Code]-[Campaign ID]`, e.g, `acme-1`. Partner code and campaign ID should both be lowercase. If no campaign ID is provided, campaign will show up as (no campaign).

__Response__

```
Set-Cookie: <Cookie with Expiration Time>
```

### Log Out (Delete Session)
__Request__

```
GET /logout
```

__Response__

```
Redirects to /signin
```

## Signup

### IAP Signup

Doing a `POST /signin` with IAP receipt will automatically create a user. An IAP-Signup User is automatically assigned a certificate with source ID `CURRENT_SOURCE_ID`.

### Email Signup - Web
__Request__

```
GET /signup
```
Name | Type | Description
--- | --- | ---
`refer` | `string` | Referral code.

### Email Signup
__Request__

```
POST /signup
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ Email to use to create the user.
`password` | `string` | __Required__ User password. Minimum 8 characters, maximum 50 characters.
`browser` | `boolean` | Whether or not this request is made from a browser, instead of an API call. If `true`, after confirming email, user will be redirected to `/signin`. If `false`, confirming email will open `tunnels://emailconfirmed` to complete signup. Defaults to `false`.
`refer` | `string` | Referral code.

__Response__

Sends a confirmation email to the user to verify they own the email, with a link to `/confirm-email`.

If `browser` == `true`

`Redirect to /signup-success`

If `browser` == `false`

```
{
	code: 1,
	message: "Email Confirmation Sent"
}
```

### Email Signup Success - Web

Asks user to check their email for a confirmation link.

__Request__

```
GET /signup-success
```

### Confirm Email

A user that confirms their email is assigned a certificate with source ID `CURRENT_SOURCE_ID`.

__Request__

```
GET /confirm-email
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ Email to confirm.
`code` | `string` | __Required__ Code that confirms a user is the owner of an email address to complete email signup.
`browser` | `boolean` | Whether or not `/signup` was done by browser or API. If `true`, redirects to `/signin`. If `false`, opens `tunnels://emailconfirmed`. Defaults to `false`.

__Response__

```
Redirect to either /account or tunnels://emailconfirmed
```

### Resend Confirmation Email - Web
__Request__

```
GET /resend-confirm-code
```

### Resend Confirmation Email
__Request__

```
POST /resend-confirm-code
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ Email to resend confirmation code to.

__Response__

```
Redirect to /signin
```

### Add Email/Password to IAP-Created User
__Request__

`Authentication Required`

```
POST /convert-shadow-user
```

Name | Type | Description
--- | --- | ---
`newemail` | `string` | __Required__ Email to add to this user.
`newpassword` | `string` | __Required__ Password to add to this user.

__Response__

Sends a confirmation email to the user to verify they own the email, with a link to `/confirm-email`.

```
{
	code: 1,
	message: "Email Confirmation Sent"
}
```

## Download App

### Webpage With Links to Apps
__Request__

```
GET /clients
```

### Download Mac App
__Request__

```
GET /download-mac-app
```

__Response__

Redirects to download the Mac app. If multiple versions are being distributed, the version that this redirects to will be selected randomly at percentages configured by the Admin Dashboard.

### Download Mac Update
__Request__

```
GET /download-mac-update
```

__Response__

Redirects to download the Mac update file. If multiple versions are being distributed, the version that this redirects to will be selected randomly at percentages configured by the Admin Dashboard.

### Download Windows App
__Request__

```
GET /download-mac-app
```

__Response__

Redirects to download the Windows app. If multiple versions are being distributed, the version that this redirects to will be selected randomly at percentages configured by the Admin Dashboard.

### Download Windows Update
__Request__

```
GET /download-windows-update
```

__Response__

Redirects to download the Windows update file. If multiple versions are being distributed, the version that this redirects to will be selected randomly at percentages configured by the Admin Dashboard.


## Get User Certificate/Key
__Request__

`Authentication Required`

```
POST /get-key
```

Name | Type | Description
--- | --- | ---
`platform` | `string` | __Required__ Must be `ios`, `android`, `windows`, or `mac`

__Response__

```
{
	id: <User ID>,
	b64: Base64 encoded client certificate
}
```

## Account Management

### Account - Web
__Request__

`Authentication Required`

```
GET /account
```

### Change Email - Web
__Request__

`Authentication Required`

`Returns CSRF Token`

```
GET /change-email
```

### Change Email
__Request__

`Authentication Required`

`CSRF Token Required`

```
POST /change-email
```

Name | Type | Description
--- | --- | ---
`_csrf` | `string` | __Required__ CSRF Token from `GET /change-email`
`currentPassword` | `string` | __Required__ User's current password.
`newEmail` | `string` | __Required__ User's new email.

__Response__

```
Redirect to /account
Sends email to confirm
```

### Change Password - Web
__Request__

`Authentication Required`

`Returns CSRF Token`

```
GET /change-password
```

### Change Password
__Request__

`Authentication Required`

`CSRF Token Required`

```
POST /change-password
```

Name | Type | Description
--- | --- | ---
`_csrf` | `string` | __Required__ CSRF Token from `GET /change-password`
`currentPassword` | `string` | __Required__ User's current password.
`newPassword` | `string` | __Required__ User's new password. Must be minimum 8 characters long, maximum 50 characters long.

__Response__

```
Redirect to /account
```

### Invoice History - Web
__Request__

`Authentication Required`

```
GET /invoices
```

### Get Invoice - Web
__Request__

`Authentication Required`

```
GET /invoices
```
Name | Type | Description
--- | --- | ---
`id` | `string` | __Required__ The ID of the invoice.

### Payment Methods - Web
__Request__

`Authentication Required`

```
GET /payment-methods
```

### New Payment Method - Web
__Request__

`Authentication Required`

```
GET /add-new-card
```

### New Payment Method
__Request__

`Authentication Required`

```
POST /add-new-card
```

Name | Type | Description
--- | --- | ---
`source` | `string` | __Required__ Source ID returned from Stripe after user submits their card information.

__Response__

```
Redirect to /payment-methods
```

### Set Default Payment Method
__Request__

`Authentication Required`

```
POST /set-default-card
```

Name | Type | Description
--- | --- | ---
`cardId` | `string` | __Required__ Stripe cardID for the payment method to set as default.

__Response__

```
{
	message: "New default set successfully"
}
```

### Delete Payment Method
__Request__

`Authentication Required`

```
POST /delete-card
```

Name | Type | Description
--- | --- | ---
`cardId` | `string` | __Required__ Stripe cardID for the payment method to delete.

__Response__

```
{
	message: "Card deleted successfully"
}
```

### Email Opt Out - Web
Links to opt out of email are automatically generated on every email sent to users, and placed at the bottom of every email. Authentication is not required to opt-out of emails, because someone may receive 

__Request__

```
GET /do-not-email
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ Email to opt-out.
`code` | `string` | __Required__ Code for opting out of emails.

### Email Opt Out
__Request__

```
POST /do-not-email
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ Email to opt-out.
`code` | `string` | __Required__ Code for opting out of emails.

__Response__

```
Redirect to /sign-in with success message
```

## Reset Password

### Request Reset Password - Web
__Request__

```
GET /forgot-password
```

### Request Reset Password
__Request__

```
POST /forgot-password
```

Name | Type | Description
--- | --- | ---
`email` | `string` | __Required__ User's email to send reset password request to.

__Response__

Sends a password request email if it exists.

```
Redirect to /signin
```

### Reset Password - Web
__Request__

```
GET /reset-password
```

Name | Type | Description
--- | --- | ---
`code` | `string` | __Required__ A reset password code that was generated for one-time use and sent to the user via email.


### Reset Password
__Request__

```
POST /reset-password
```

Name | Type | Description
--- | --- | ---
`code` | `string` | __Required__ A reset password code that was generated for one-time use and sent to the user via email.
`newPassword` | `string` | __Required__ The new password for the user. Minimum 8 characters, maximum 50 characters.

__Response__

```
Redirect to /signin
```

## Subscription Management

### Get Subscriptions
__Request__

`Authentication Required`

```
POST /subscriptions
```

__Response__

```
[
	{
	    "planType": "all-monthly",
	    "receiptId": "GPA.3353-4716-1949-52255",
	    "expirationDate": "2018-03-10T07:14:06.065Z",
	    "expirationDateString": "March 10, 2018",
	    "expirationDateMs": 1520666046.065,
	    "cancellationDate": null,
	    "cancellationDateString": null,
	    "cancellationDateMs": null,
	    "userId": "a25b8f5640106f9e9a4990e592a3dc4e",
	    "receiptType": "android",
	    "inTrial": false,
	    "renewEnabled": true
	}
]
```

### Get Active Subscriptions
__Request__

`Authentication Required`

```
POST /active-subscriptions
```

__Response__

```
[
	{
	    "planType": "all-monthly",
	    "receiptId": "GPA.3353-4716-1949-52255",
	    "expirationDate": "2018-03-10T07:14:06.065Z",
	    "expirationDateString": "March 10, 2018",
	    "expirationDateMs": 1520666046.065,
	    "cancellationDate": null,
	    "cancellationDateString": null,
	    "cancellationDateMs": null,
	    "userId": "a25b8f5640106f9e9a4990e592a3dc4e",
	    "receiptType": "android",
	    "inTrial": false,
	    "renewEnabled": true
	}
]
```

### New Pro Subscription - Web

This is used by both browser and Mac/PC clients in a webview to create a new Pro subscription via Stripe. Creating subscriptions on iOS/Android clients don't use this because that's handled by iTunes and Google Play.

__Request__

`Authentication Required`

```
GET /new-subscription
```

Name | Type | Description
--- | --- | ---
`upgrade` | `string` | Can be `ios/android-monthly`, `ios/android-annual`, or not specified. If user is upgrading from an `ios` or `android` only plan, redirect them to instructions on how to cancel their iOS/Android subscription after they complete this new subscription signup. No default value.
`browser` | `boolean` | Shows top logo and navigation bar if `true`. Mac/PC clients using a webview should use `false`. Defaults to `false`. 
`plan` | `string` | The plan to subscribe to. Can be `all-monthly` or `all-annual`. Defaults to `all-monthly`.
`locale` | `string` | Locale of user's machine, used for displaying expected currency to pay in, and recorded to Stripe as per legal requirements. User is not guaranteed to pay in this currency - actual payment currency will be based on the country of the credit card. Defaults to `en-US`.
`source` | `string` | Used for Stripe's 3D Secure verification
`client_secret` | `string` | Used for Stripe's 3D Secure verification

__Response__

If user already has an active Pro subscription
```
Redirect to /account with "You already have a Pro subscription"
```

If user doesn't have an active Pro subscription

```
Render new subscription page using locale and existing payment methods, if any.
```

### New Pro Subscription
__Request__

`Authentication Required`

```
POST /new-subscription
```

Name | Type | Description
--- | --- | ---
`source` | `string` | __Required__ Source ID of a payment method either created by the frontend, or existing on the Stripe customer.
`is3ds` | `boolean` | Whether or not the source is a newly created 3D Secure payment method. If it is, then a trial is not allowed. Also, we create a charge instead of invoice for the first month/year, then create a subscription plan with that duration as the "trial". Defaults to `false'.
`trial` | `boolean` | __Required__ Whether or not to request a trial period. If a user has already had a previous subscription, the server will return an error if another trial is requested.
`plan` | `string` | __Required__ The plan to subscribe to. Can be `all-monthly` or `all-annual`.
`upgrade` | `string` | Can be `ios/android-monthly`, `ios/android-annual`, or not specified. If user is upgrading from an `ios` or `android` only plan, redirect them to instructions on how to cancel their iOS/Android subscription after they complete this new subscription signup. No default.
`browser` | `boolean` | If `true`, success redirects to `/clients`. If `false`, success redirects to `tunnels://stripesuccess`. Defaults to `false`. 

__Response__

If `upgrade` specified

```
Redirect to /account with message:
Be sure to cancel your iOS/Android-only subscription with Apple iTunes/Google Play
```

Else if `browser` == `true`

```
Redirect to /clients

```

Else

```
Redirect to tunnels://stripesuccess
```

### Cancel Subscription - Web
__Request__

`Authentication Required`

```
GET /cancel-subscription
```

Name | Type | Description
--- | --- | ---
`receiptId` | `string` | __Required__ Receipt ID of the subscription to cancel.
`receiptType` | `string` | __Required__ Receipt type of the subscription to cancel. Can be `android`, `ios`, or `stripe`.

__Response__

If `receiptType` == `ios`/`android`
```
Redirect to /account with message:
Subscriptions made through the iOS/Android app must be cancelled through Apple/Google Play
```

Else

```
Render cancel-subscription view with receiptId
```

### Cancel Pro Subscription
__Request__

`Authentication Required`

```
POST /cancel-subscription
```

Name | Type | Description
--- | --- | ---
`receiptId` | `string` | __Required__ Receipt ID of the Pro subscription to cancel.
`reason` | `string` | The reason a user is cancelling their subscription.

__Response__

```
Redirect to /account.
```

## Diagnostic/Other APIs

### Test Error Logging
__Request__

```
GET /error-test
```

### Health Check
__Request__

```
GET /health
```

__Response__

```
Status 200
{
	message: "OK from www." + DOMAIN
}
```

### Get Current IP
__Request__

```
GET /ip
```

__Response__

```
Status 200
{
	ip: 12.34.56.78
}
```

### Speed Test Bucket
__Request__

```
GET /download-speed-test
```

__Response__

Speed test files will be accessible by the following format, which allows for faster transfers:
`https://<bucket>.s3-accelerate.amazonaws.com/<filename>`

```
Status 200
{
	bucket: confirmedvpn-speedtest-bucket
}
```

## Error Responses

Responses with status code 500 will show `Unknown Error` to user/client and will alert you by email at `admin@[domain]` or `team@[domain]`.

```
2XX - Success with Message
4XX - Client Error
429 - Too Many Requests
5XX - Server Error
```

### Response Format
JSON response with `code` (see `Error Codes`) and `message`. 500 status code errors are server errors which aren't exposed to the client and show a code of -1.
```
{
	code: 2, 
	message: "Some error message, like Password Too Short"
}
```

### Too Many Requests
If a client calls an API too frequently, the server will respond with status code `429` and a JSON body of:

```
{
	code: 999,
	message: "Too many requests in this time frame.",
	nextValidRequestDate: [Date of next valid request],
	nextValidRequestDateHuman: [Human readable date of next valid request]
}
```

### Error Reference

Status Code | Error Code | Message
--- | --- | ---
500 | -1 | Internal server error
200 | 1 | Email not confirmed
200 | 6 | No active subscriptions
200 | 62 | Renewer - Invalid purchase token
200 | 995 | Renewer - Apple iTunes non-retryable error
401 | 2 | Incorrect Login, Session Expired/Invalid, or No Such User
400 | 3 | Request field validation error (e.g, Password too short, etc)
400 | 5 | Missing receipt in receipt request
400 | 9 | Invalid iOS IAP receipt
400 | 10 | Error on response from Apple for receipt verification
400 | 11 | Invalid IAP receipt type
400 | 18 | No such confirmation code
400 | 26 | Error getting subscription - no such subscription
400 | 29 | Already had a trial, not allowing another
400 | 31 | Error deleting user
400 | 38 | Request Mac/Windows but no Pro subscription
400 | 40 | Email already registered
400 | 48 | Cannot convert shadow user that already has a confirmed email
400 | 49 | Unrecognized product ID from iOS IAP receipt
400 | 51 | Requested Android but no Android/Pro subscription
400 | 52 | Requested iOS but no iOS/Pro subscription
400 | 57 | Can't use iOS/Android test suite receipt outside of test suite
400 | 59 | No such email
400 | 60 | Email already confirmed
400 | 63 | Android receipt does not match its signature
400 | 64 | Android purchase failed on client side with __Response__ code
400 | 65 | Unable to decode Android base64 receipt sent from client
400 | 66 | Missing field in Android receipt
400 | 67 | Android payment not received - still pending
400 | 68 | Invalid Android productId
400 | 69 | OrderId in client receipt and Google verified receipt do not match
400 | 77 | Error setting new user password: Invalid reset code
400 | 81 | Can't delete default payment method
400 | 82 | Can't delete last payment method
400 | 89 | Wrong email or code for email opt-out
400 | 99 | Admin - source ID already exists, choose new one
400 | 108 | Error adding payment method card
400 | 109 | Error setting default payment method card
400 | 110 | Can't change email on a user that doesn't have a confirmed email
400 | 125 | Referral code doesn't exist
429 | 999 | Too many requests

## Feedback
If you have any questions, concerns, or other feedback, please let us know any feedback in Github issues or by e-mail.

We also have a bug bounty program -- please email <engineering@confirmedvpn.com> for details.

## License

This project is licensed under the GPL License - see the [LICENSE.md](LICENSE.md) file for details

## Contact

<engineering@confirmedvpn.com>

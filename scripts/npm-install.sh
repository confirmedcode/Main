#!/bin/bash

cd /home/node/main
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true
# Point shared repo at the one in this environment and branch
npm install --save git+https://git-codecommit.$AWS_REGION.amazonaws.com/v1/repos/$ENVIRONMENT-Shared#$GIT_BRANCH
# Choose the right full-icu for this node version and operating system
npm uninstall full-icu
npm install full-icu
# Clear and reinstall node modules
rm -rf node_modules
npm install --production
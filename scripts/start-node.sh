#!/bin/bash

export NODE_ENV=production

cd /home/node/main
pm2 updatePM2 # pick up new node version if we upgraded
pm2 delete all
pm2 start index.js -i max --merge-logs --log ../logs/app.log --node-args="--icu-data-dir=node_modules/full-icu"
pm2 save
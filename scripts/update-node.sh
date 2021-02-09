#!/bin/bash

set -x

npm install -g n
n 10
npm install -g npm@6

# Install latest pm2
npm install -g pm2

# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 2
#!/bin/bash

set -x

npm install -g n
n 12
npm install -g npm@6

# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 2

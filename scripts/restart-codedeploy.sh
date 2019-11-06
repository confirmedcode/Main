set -x

at -M now + 2 minute <<< $'service codedeploy-agent restart'
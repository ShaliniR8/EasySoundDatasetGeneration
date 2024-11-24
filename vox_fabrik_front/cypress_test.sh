#!/bin/bash

NODEJS_BACKEND_URL=$(grep "nodejs-backend" C:/ngrok/output.log | sed -n 's/.*url=\(https:\/\/[^ ]*\).*/\1/p')

if [ -z "$NODEJS_BACKEND_URL" ]; then
  echo "Error: nodejs-backend URL not found."
  exit 1
fi

npx cypress open --env nodeJsBaseUrl="$NODEJS_BACKEND_URL"

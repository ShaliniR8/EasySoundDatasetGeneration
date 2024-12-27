#!/bin/bash

# # Start ngrok and redirect logs
/mnt/c/ngrok/ngrok.exe start --all --log=stdout > /mnt/c/ngrok/output.txt &

echo "Wait.."
sleep 5
echo "Next.."

# Extract URLs from the log
PYTHON_BACKEND_URL=$(grep "python-backend" /mnt/c/ngrok/output.txt | sed -n 's/.*url=\(https:\/\/[^ ]*\).*/\1/p')
REACT_APP_API_WEBSOCKET_URL=$(sed 's/^https:/wss:/' <<< "$PYTHON_BACKEND_URL")/ws
NODEJS_BACKEND_URL=$(grep "nodejs-backend" /mnt/c/ngrok/output.txt | sed -n 's/.*url=\(https:\/\/[^ ]*\).*/\1/p')

# Check if URLs were found
if [ -z "$PYTHON_BACKEND_URL" ]; then
  echo "Error: python-backend URL not found in output.txt"
  exit 1
fi

if [ -z "$NODEJS_BACKEND_URL" ]; then
  echo "Error: nodejs-backend URL not found in output.txt"
  exit 1
fi

echo "Extracted python-backend URL: $PYTHON_BACKEND_URL ..."
echo "Extracted nodejs-backend URL: $NODEJS_BACKEND_URL ..."

# Set environment variables and build the project
echo "Setting up environment variables..."
cross-env REACT_APP_API_PYTHON_BASE_URL="$PYTHON_BACKEND_URL" REACT_APP_API_WEBSOCKET_URL="$REACT_APP_API_WEBSOCKET_URL" REACT_APP_API_NODEJS_BASE_URL="$NODEJS_BACKEND_URL" react-scripts start

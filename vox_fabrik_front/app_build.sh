#!/bin/bash

# Convert the file to UTF-8 format if necessary
iconv -f utf-16 -t utf-8 C:/ngrok/output.txt > C:/ngrok/output.log

# Extract the python-backend URL
PYTHON_BACKEND_URL=$(grep "python-backend" C:/ngrok/output.log | sed -n 's/.*url=\(https:\/\/[^ ]*\).*/\1/p')

# Check if the URL was found
if [ -z "$PYTHON_BACKEND_URL" ]; then
  echo "Error: python-backend URL not found in output.log"
  exit 1
fi

echo "Extracted python-backend URL: $PYTHON_BACKEND_URL"

# Set environment variables and build the project
echo "Setting up environment variables and building..."
cross-env REACT_APP_API_PYTHON_BASE_URL="$PYTHON_BACKEND_URL" REACT_APP_API_NODEJS_BASE_URL=http://localhost:8080 react-scripts build
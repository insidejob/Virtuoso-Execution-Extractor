#!/bin/bash

# Exact API test matching what the user did in API docs
# Shows full request/response for debugging

echo "🔍 Debugging Virtuoso API - Exact Match"
echo "========================================"
echo "Server: https://api-app2.virtuoso.qa/api"
echo "Token: Bearer 9e141010..."
echo "========================================"
echo ""

TOKEN="9e141010-eca5-43f5-afb9-20dc6c49833f"
BASE_URL="https://api-app2.virtuoso.qa/api"
JOB_ID="88715"

# Test 1: Exact as API docs would send
echo "📡 Test 1: Execution Status (exact as API docs)"
echo "------------------------------------------------"
curl -v -X GET "${BASE_URL}/executions/${JOB_ID}/status" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  2>&1 | grep -E "^(> |< |{|\[|HTTP)"

echo ""
echo ""

# Test 2: Without /api suffix (maybe it's added automatically)
echo "📡 Test 2: Without /api suffix"
echo "-------------------------------"
curl -v -X GET "https://api-app2.virtuoso.qa/executions/${JOB_ID}/status" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  2>&1 | grep -E "^(> |< |{|\[|HTTP)"

echo ""
echo ""

# Test 3: With additional headers API docs might send
echo "📡 Test 3: With all possible headers"
echo "------------------------------------"
curl -v -X GET "${BASE_URL}/executions/${JOB_ID}/status" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Accept-Language: en-US,en;q=0.9" \
  -H "Cache-Control: no-cache" \
  -H "Content-Type: application/json" \
  -H "Origin: https://api-app2.virtuoso.qa" \
  -H "Referer: https://api-app2.virtuoso.qa/api-docs" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "X-Requested-With: XMLHttpRequest" \
  2>&1 | grep -E "^(> |< |{|\[|HTTP)"

echo ""
echo ""

# Test 4: Check if we can access the API docs
echo "📡 Test 4: API Documentation Access"
echo "-----------------------------------"
curl -s -I "https://api-app2.virtuoso.qa/api-docs" | head -10

echo ""
echo ""

# Test 5: Try the analysis endpoint
echo "📡 Test 5: Execution Analysis"
echo "-----------------------------"
curl -X GET "${BASE_URL}/executions/analysis/${JOB_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --silent --show-error | head -100

echo ""
echo ""

# Show exactly what we're sending
echo "📋 Exact curl command to copy:"
echo "------------------------------"
echo "curl -X GET \"${BASE_URL}/executions/${JOB_ID}/status\" \\"
echo "  -H \"Authorization: Bearer ${TOKEN}\" \\"
echo "  -H \"Accept: application/json\" \\"
echo "  -H \"Content-Type: application/json\""

echo ""
echo "🔍 To debug further:"
echo "-------------------"
echo "1. Open browser DevTools Network tab"
echo "2. Use the API docs interface to make a request"
echo "3. Right-click the request → Copy as cURL"
echo "4. Compare headers with what we're sending"
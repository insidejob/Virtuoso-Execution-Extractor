#!/bin/bash

# Final test to determine the exact issue with the token

echo "🔍 Final Token Diagnostic"
echo "========================================"
echo ""

TOKEN="9e141010-eca5-43f5-afb9-20dc6c49833f"
URL="https://api-app2.virtuoso.qa/api/testsuites/527211?envelope=false"

echo "Testing: $URL"
echo "Token: ${TOKEN:0:20}..."
echo ""

echo "1. Test with Bearer token (standard):"
echo "--------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")
  
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

echo "2. Test without Bearer prefix:"
echo "-------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$URL" \
  -H "Authorization: $TOKEN" \
  -H "Accept: application/json")
  
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "Status: $HTTP_CODE"
echo ""

echo "3. Test as API Key:"
echo "-------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$URL" \
  -H "X-API-Key: $TOKEN" \
  -H "Accept: application/json")
  
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "Status: $HTTP_CODE"
echo ""

echo "4. Test with query parameter:"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${URL}&api_key=${TOKEN}")
  
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "Status: $HTTP_CODE"
echo ""

echo "5. Test SSO endpoint (should work):"
echo "-----------------------------------"
SSO_URL="https://api-app2.virtuoso.qa/api/auth/sso?organization=1964&userEmail=ed.clarke@spotqa.com"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$SSO_URL")
  
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:" | jq '.success' 2>/dev/null || echo "Failed to parse")

echo "Status: $HTTP_CODE"
echo "Success: $BODY"
echo ""

echo "========================================"
echo "📊 CONCLUSION"
echo "========================================"
echo ""
echo "If SSO works (200) but testsuite fails (401):"
echo "  → The token is NOT valid for API access"
echo ""
echo "Please verify in Postman:"
echo "1. Make the exact same request to:"
echo "   $URL"
echo ""
echo "2. Click 'Code' → 'cURL'"
echo "3. Copy and share the ENTIRE command"
echo ""
echo "Or check Postman's Authorization tab:"
echo "  - Is there a different token?"
echo "  - Are there environment variables?"
echo "  - Is 'Inherit auth from parent' checked?"
echo ""
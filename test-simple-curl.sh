#!/bin/bash

# Simple test to verify if the issue is with the token or the execution

echo "🔍 Simple API Test"
echo "=================="
echo ""

TOKEN="9e141010-eca5-43f5-afb9-20dc6c49833f"
BASE_URL="https://api-app2.virtuoso.qa/api"

echo "1. Testing SSO endpoint (no auth - should work):"
echo "-------------------------------------------------"
curl -s "${BASE_URL}/auth/sso?organization=1964&userEmail=ed.clarke@spotqa.com" | jq '.success' || echo "Failed"

echo ""
echo "2. Testing execution with YOUR token:"
echo "-------------------------------------"
echo "Token: ${TOKEN:0:20}..."
echo ""
curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/executions/88715/status" | jq '.' || echo "Failed"

echo ""
echo "3. Please run this EXACT command in Postman:"
echo "--------------------------------------------"
echo "GET https://api-app2.virtuoso.qa/api/executions/88715/status"
echo "Authorization: Bearer ${TOKEN}"
echo ""
echo "Then click 'Code' button → 'cURL' and paste here what it shows"
echo ""

echo "4. Or try this - Get a NEW token:"
echo "---------------------------------"
echo "In Postman, if it's working, check:"
echo "- Authorization tab → Current Token Value"
echo "- Is it exactly: ${TOKEN} ?"
echo "- Or is it different?"
echo ""

echo "5. Check Postman Cookies:"
echo "------------------------"
echo "In Postman → Cookies → api-app2.virtuoso.qa"
echo "Are there any cookies being sent?"
echo ""
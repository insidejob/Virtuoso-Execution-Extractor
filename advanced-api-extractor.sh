#!/bin/bash

# Advanced Virtuoso API Extractor for Execution 88715
# Comprehensive terminal-based extraction with all discovered patterns

echo "🚀 Virtuoso API Advanced Extractor"
echo "=================================="
echo "Execution: 88715"
echo "Journey: 527218"
echo "Project: 4889"
echo "=================================="

# Configuration
BASE_URL="https://api-app2.virtuoso.qa/api"
TOKEN="9e141010-eca5-43f5-afb9-20dc6c49833f"
EXECUTION_ID="88715"
JOURNEY_ID="527218"
PROJECT_ID="4889"
ORG_ID="1964"

# Create output directory
OUTPUT_DIR="extraction_88715_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo ""
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Function to make API call and save response
make_api_call() {
    local endpoint=$1
    local description=$2
    local output_file=$3
    
    echo "📡 $description"
    echo "   Endpoint: $endpoint"
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/json" \
        -H "X-Organization-Id: $ORG_ID" \
        "${BASE_URL}${endpoint}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ Success (HTTP $http_code)"
        echo "$body" | jq '.' > "$OUTPUT_DIR/$output_file" 2>/dev/null || echo "$body" > "$OUTPUT_DIR/$output_file"
        return 0
    else
        echo "   ⚠️  Failed (HTTP $http_code)"
        echo "HTTP $http_code" > "$OUTPUT_DIR/${output_file}.error"
        return 1
    fi
    echo ""
}

# Try all discovered API patterns
echo "🔍 Testing All API Patterns"
echo "============================"
echo ""

# Core execution endpoints
make_api_call "/executions/$EXECUTION_ID" \
    "Execution details" \
    "execution.json"

make_api_call "/executions/$EXECUTION_ID/journeys/$JOURNEY_ID" \
    "Execution journey" \
    "execution_journey.json"

make_api_call "/projects/$PROJECT_ID/executions/$EXECUTION_ID" \
    "Project execution" \
    "project_execution.json"

# Journey as TestSuite (critical discovery)
make_api_call "/projects/$PROJECT_ID/testsuites/$JOURNEY_ID" \
    "Journey as TestSuite" \
    "testsuite.json"

# Detailed data endpoints
make_api_call "/executions/$EXECUTION_ID/checkpoints" \
    "Execution checkpoints" \
    "checkpoints.json"

make_api_call "/executions/$EXECUTION_ID/steps" \
    "Execution steps" \
    "steps.json"

make_api_call "/projects/$PROJECT_ID/testsuites/$JOURNEY_ID/steps" \
    "Journey steps" \
    "journey_steps.json"

# Additional data
make_api_call "/executions/$EXECUTION_ID/screenshots" \
    "Screenshots" \
    "screenshots.json"

make_api_call "/executions/$EXECUTION_ID/logs" \
    "Execution logs" \
    "logs.json"

make_api_call "/executions/$EXECUTION_ID/results" \
    "Execution results" \
    "results.json"

# Test data and metadata
make_api_call "/projects/$PROJECT_ID/testdata/$JOURNEY_ID" \
    "Test data" \
    "testdata.json"

make_api_call "/journeys/$JOURNEY_ID/metadata" \
    "Journey metadata" \
    "metadata.json"

# Organization endpoint
make_api_call "/organizations/$ORG_ID/projects/$PROJECT_ID/executions/$EXECUTION_ID" \
    "Organization execution" \
    "org_execution.json"

# Count successful extractions
SUCCESS_COUNT=$(ls -1 "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l)
ERROR_COUNT=$(ls -1 "$OUTPUT_DIR"/*.error 2>/dev/null | wc -l)

echo ""
echo "📊 Extraction Summary"
echo "===================="
echo "✅ Successful: $SUCCESS_COUNT endpoints"
echo "❌ Failed: $ERROR_COUNT endpoints"
echo ""

# Try to combine successful data
if [ "$SUCCESS_COUNT" -gt 0 ]; then
    echo "🔄 Combining extracted data..."
    
    cat > "$OUTPUT_DIR/combined_data.json" << EOF
{
  "executionId": $EXECUTION_ID,
  "journeyId": $JOURNEY_ID,
  "projectId": $PROJECT_ID,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "extractedEndpoints": $SUCCESS_COUNT,
  "data": {
EOF
    
    first=true
    for file in "$OUTPUT_DIR"/*.json; do
        if [ "$file" != "$OUTPUT_DIR/combined_data.json" ]; then
            basename=$(basename "$file" .json)
            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> "$OUTPUT_DIR/combined_data.json"
            fi
            echo -n "    \"$basename\": " >> "$OUTPUT_DIR/combined_data.json"
            cat "$file" >> "$OUTPUT_DIR/combined_data.json"
        fi
    done
    
    echo "" >> "$OUTPUT_DIR/combined_data.json"
    echo "  }" >> "$OUTPUT_DIR/combined_data.json"
    echo "}" >> "$OUTPUT_DIR/combined_data.json"
    
    echo "✅ Combined data saved to: $OUTPUT_DIR/combined_data.json"
fi

echo ""
echo "🚀 Next Steps:"
echo "============="
if [ "$SUCCESS_COUNT" -gt 0 ]; then
    echo "1. Review extracted data:"
    echo "   ls -la $OUTPUT_DIR/"
    echo ""
    echo "2. Convert to NLP format:"
    echo "   node ENHANCED-NLP-CONVERTER.js $OUTPUT_DIR/combined_data.json"
    echo ""
    echo "3. Test with specific data files:"
    for file in "$OUTPUT_DIR"/*.json; do
        if [ -f "$file" ] && [ "$file" != "$OUTPUT_DIR/combined_data.json" ]; then
            basename=$(basename "$file")
            echo "   node ENHANCED-NLP-CONVERTER.js $OUTPUT_DIR/$basename"
            break
        fi
    done
else
    echo "⚠️  No successful API extractions. Try these alternatives:"
    echo ""
    echo "1. Check authentication token:"
    echo "   curl -H 'Authorization: Bearer $TOKEN' $BASE_URL/auth/verify"
    echo ""
    echo "2. Use browser extraction fallback:"
    echo "   - Navigate to: https://app2.virtuoso.qa/#/project/$PROJECT_ID/execution/$EXECUTION_ID/journey/$JOURNEY_ID"
    echo "   - Open browser console"
    echo "   - Run: extract-execution-88715.js"
    echo ""
    echo "3. Try with cookies instead of token:"
    echo "   - Export cookies from browser"
    echo "   - Use cookie-based authentication"
fi

echo ""
echo "✨ Extraction complete!"
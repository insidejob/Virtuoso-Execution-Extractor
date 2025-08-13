#!/bin/bash

# Virtuoso Bulk Extractor - Example Usage Scripts
# 
# This script demonstrates common bulk extraction scenarios
# for fast, scalable extraction of thousands of executions

echo "🚀 Virtuoso Bulk Extractor - Example Usage Scripts"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Example project ID (replace with your actual project)
PROJECT_ID="4889"

echo ""
echo -e "${BLUE}📋 Example 1: Basic Bulk Extraction${NC}"
echo "Extract last 30 days from project with default settings"
echo "Command: node extract-bulk.js --project $PROJECT_ID"
echo ""
echo "Expected Performance:"
echo "  • ~10x faster than sequential extraction"
echo "  • Memory usage: ~50-100MB"
echo "  • Output: Raw data for all executions"
echo ""

echo -e "${BLUE}📋 Example 2: High-Performance Full Processing${NC}"
echo "Extract last 7 days with maximum processing and performance"
echo "Command: node extract-bulk.js --project $PROJECT_ID --days 7 --workers 15 --all"
echo ""
echo "Expected Performance:"
echo "  • ~15x faster than sequential extraction"
echo "  • Memory usage: ~200-300MB"
echo "  • Output: Raw data + NLP + Variables + Validation"
echo ""

echo -e "${BLUE}📋 Example 3: Specific Execution IDs${NC}"
echo "Extract specific executions for targeted analysis"
echo "Command: node extract-bulk.js --project $PROJECT_ID --executions \"173822,173819,173818,173787\" --all"
echo ""
echo "Expected Performance:"
echo "  • Near-instant for small sets"
echo "  • Memory usage: <50MB"
echo "  • Output: Complete processing for selected executions"
echo ""

echo -e "${BLUE}📋 Example 4: Date Range with CSV Export${NC}"
echo "Extract specific date range and generate CSV for analysis"
echo "Command: node extract-bulk.js --project $PROJECT_ID --date-from 2025-08-01 --date-to 2025-08-13 --format csv --workers 12"
echo ""
echo "Expected Performance:"
echo "  • ~12x faster than sequential extraction"
echo "  • Memory usage: ~150MB"
echo "  • Output: Raw data + CSV export for spreadsheet analysis"
echo ""

echo -e "${BLUE}📋 Example 5: Goal-Specific Extraction${NC}"
echo "Extract only executions from specific goals/test suites"
echo "Command: node extract-bulk.js --project $PROJECT_ID --goals \"Demo,Admin Section\" --days 14 --all"
echo ""
echo "Expected Performance:"
echo "  • Filtered extraction reduces processing time"
echo "  • Memory usage: Variable based on goal size"
echo "  • Output: Complete processing for matched goals only"
echo ""

echo -e "${BLUE}📋 Example 6: Conservative Settings for Stability${NC}"
echo "Conservative settings for systems with limited resources"
echo "Command: node extract-bulk.js --project $PROJECT_ID --workers 3 --rate-limit 20 --max-memory 200 --retries 5"
echo ""
echo "Expected Performance:"
echo "  • ~3x faster than sequential extraction"
echo "  • Memory usage: <200MB guaranteed"
echo "  • Output: Reliable extraction with multiple retries"
echo ""

echo -e "${BLUE}📋 Example 7: Dry Run for Planning${NC}"
echo "Preview what would be extracted without actually doing it"
echo "Command: node extract-bulk.js --project $PROJECT_ID --days 30 --dry-run"
echo ""
echo "Expected Output:"
echo "  • List of executions that would be processed"
echo "  • Performance estimates"
echo "  • No actual extraction performed"
echo ""

echo -e "${BLUE}📋 Example 8: Resume Interrupted Extraction${NC}"
echo "Resume a bulk extraction that was interrupted"
echo "Command: node extract-bulk.js --project $PROJECT_ID --resume"
echo ""
echo "Expected Behavior:"
echo "  • Automatically detects previous session"
echo "  • Skips already completed extractions"
echo "  • Continues from where it left off"
echo ""

echo ""
echo -e "${GREEN}🧪 Testing Commands${NC}"
echo "=================================================="
echo ""

echo -e "${YELLOW}Test 1: Validate System${NC}"
echo "node test-bulk-extractor.js"
echo ""

echo -e "${YELLOW}Test 2: Quick Dry Run${NC}"
echo "node extract-bulk.js --project $PROJECT_ID --executions \"173822,173819\" --dry-run --debug"
echo ""

echo -e "${YELLOW}Test 3: Single Execution Benchmark${NC}"
echo "time node extract-bulk.js --project $PROJECT_ID --executions \"173822\" --all --workers 1"
echo ""

echo ""
echo -e "${GREEN}📊 Performance Benchmarking${NC}"
echo "=================================================="
echo ""

echo -e "${YELLOW}Benchmark Different Worker Counts${NC}"
echo 'for workers in 1 5 10 15 20; do'
echo '  echo "Testing $workers workers..."'
echo "  time node extract-bulk.js --project $PROJECT_ID --executions \"173822,173819,173818\" --workers \$workers"
echo 'done'
echo ""

echo -e "${YELLOW}Memory Usage Monitoring${NC}"
echo "# Run extraction while monitoring memory usage"
echo "htop &  # Or Activity Monitor on macOS"
echo "node extract-bulk.js --project $PROJECT_ID --days 7 --all --debug"
echo ""

echo ""
echo -e "${GREEN}🔧 Troubleshooting Examples${NC}"
echo "=================================================="
echo ""

echo -e "${YELLOW}API Discovery Issues${NC}"
echo "If automatic execution discovery fails:"
echo "1. Try specific execution IDs: --executions \"173822,173819\""
echo "2. Try shorter date range: --days 7"
echo "3. Check API credentials in config/v10-credentials.json"
echo ""

echo -e "${YELLOW}Performance Issues${NC}"
echo "If extraction is slow or failing:"
echo "1. Reduce workers: --workers 5"
echo "2. Lower rate limit: --rate-limit 25"
echo "3. Increase memory: --max-memory 1000"
echo "4. Enable debug mode: --debug"
echo ""

echo -e "${YELLOW}Memory Issues${NC}"
echo "If running out of memory:"
echo "1. Reduce workers: --workers 3"
echo "2. Lower memory limit: --max-memory 250"
echo "3. Process in smaller batches"
echo ""

echo ""
echo -e "${GREEN}💡 Pro Tips${NC}"
echo "=================================================="
echo ""

echo "1. Always start with a dry run to estimate scope"
echo "2. Use specific execution IDs for targeted analysis"
echo "3. Enable --all flag for complete processing"
echo "4. Monitor memory usage on first large extraction"
echo "5. Use CSV export for analysis in Excel/Google Sheets"
echo "6. Save successful configurations for repeated use"
echo "7. Use resume functionality for large datasets"
echo ""

echo -e "${GREEN}🎯 Real-World Scenarios${NC}"
echo "=================================================="
echo ""

echo -e "${BLUE}Scenario 1: Daily Test Results Analysis${NC}"
echo "Extract yesterday's executions with full processing"
echo "node extract-bulk.js --project $PROJECT_ID --days 1 --all --format both"
echo ""

echo -e "${BLUE}Scenario 2: Weekly Performance Review${NC}"
echo "Extract last week's executions for team review"
echo "node extract-bulk.js --project $PROJECT_ID --days 7 --all --workers 15"
echo ""

echo -e "${BLUE}Scenario 3: Monthly Quality Report${NC}"
echo "Extract month's data with validation for quality metrics"
echo "node extract-bulk.js --project $PROJECT_ID --days 30 --validate --format csv"
echo ""

echo -e "${BLUE}Scenario 4: Specific Feature Testing${NC}"
echo "Extract executions from specific test suites"
echo "node extract-bulk.js --project $PROJECT_ID --goals \"Login,Checkout,Payment\" --days 14 --all"
echo ""

echo -e "${BLUE}Scenario 5: Failure Analysis${NC}"
echo "Extract recent executions for debugging failures"
echo "node extract-bulk.js --project $PROJECT_ID --days 3 --all --workers 20 --debug"
echo ""

echo ""
echo -e "${GREEN}✅ Ready to Use!${NC}"
echo "=================================================="
echo ""
echo "The Virtuoso Bulk Extractor is ready for high-performance extraction."
echo "Start with a dry run, then scale up based on your needs."
echo ""
echo "For help: node extract-bulk.js --help"
echo "For testing: node test-bulk-extractor.js"
echo ""
echo "Happy extracting! 🚀"
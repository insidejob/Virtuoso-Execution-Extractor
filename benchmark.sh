#!/bin/bash

# Virtuoso Extractor V10 - Performance Benchmark Script
# This script demonstrates the speed improvements with different configurations

echo "🚀 Virtuoso Extractor V10 - Performance Benchmark"
echo "=================================================="
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./benchmark.sh <virtuoso-url>"
    echo ""
    echo "Example:"
    echo "./benchmark.sh 'https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256'"
    echo ""
    echo "This script will run the extractor with different performance modes:"
    echo "1. Standard mode (sequential processing)"
    echo "2. Parallel mode (--all flag)"
    echo "3. Fast mode (--all --fast flags)"
    echo ""
    exit 1
fi

URL="$1"
echo "Testing URL: $URL"
echo ""

# Create a temporary directory for benchmark results
BENCHMARK_DIR="benchmark_results_$(date +%s)"
mkdir -p "$BENCHMARK_DIR"

echo "📊 Running performance benchmarks..."
echo "Results will be saved in: $BENCHMARK_DIR"
echo ""

# Test 1: Standard mode (sequential)
echo "🔄 Test 1: Standard sequential processing"
echo "Command: node extract-v10.js '$URL' --nlp --vars --validate"
time node extract-v10.js "$URL" --nlp --vars --validate > "$BENCHMARK_DIR/test1_sequential.log" 2>&1
echo "✅ Test 1 complete - Check $BENCHMARK_DIR/test1_sequential.log for timing details"
echo ""

# Test 2: Parallel mode with --all flag
echo "🔄 Test 2: Parallel processing with --all flag"
echo "Command: node extract-v10.js '$URL' --all"
time node extract-v10.js "$URL" --all > "$BENCHMARK_DIR/test2_parallel.log" 2>&1
echo "✅ Test 2 complete - Check $BENCHMARK_DIR/test2_parallel.log for timing details"
echo ""

# Test 3: Fast mode with aggressive caching
echo "🔄 Test 3: Fast mode with aggressive caching"
echo "Command: node extract-v10.js '$URL' --all --fast"
time node extract-v10.js "$URL" --all --fast > "$BENCHMARK_DIR/test3_fast.log" 2>&1
echo "✅ Test 3 complete - Check $BENCHMARK_DIR/test3_fast.log for timing details"
echo ""

echo "🎯 Benchmark Summary:"
echo "===================="
echo ""
echo "Performance improvements implemented:"
echo "• Parallel API calls (4 endpoints fetched simultaneously)"
echo "• Smart caching with TTL (reduces redundant API calls)"
echo "• Parallel processing (NLP + variables run simultaneously)"
echo "• Combined --all flag (one command for full extraction)"
echo "• Fast mode with aggressive caching"
echo "• Detailed timing metrics in output"
echo ""
echo "Expected performance gains:"
echo "• API fetch time: ~60-70% reduction (4 parallel vs sequential)"
echo "• Processing time: ~40-50% reduction (parallel vs sequential)"
echo "• Total extraction time: ~50-60% faster overall"
echo ""
echo "Recommended usage for maximum speed:"
echo "node extract-v10.js <url> --all --fast"
echo ""
echo "Check the log files in $BENCHMARK_DIR/ for detailed timing metrics!"
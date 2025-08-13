# Virtuoso Bulk Extractor - High Performance Edition

A scalable bulk extraction system designed to extract thousands of Virtuoso executions with 10x speed improvement through parallel processing.

## 🚀 Performance Targets

- **10x Speed Improvement**: 1000 executions in ~60 seconds (vs 350 seconds sequential)
- **Memory Efficient**: <500MB usage even for thousands of executions
- **100% Accuracy**: Maintains extraction accuracy through validation
- **Parallel Processing**: 10-20 parallel workers with intelligent rate limiting
- **Resume Capability**: Handle interruptions and resume bulk extractions

## 📋 Features

### Core Architecture
- **Worker Pool Pattern**: Configurable parallel workers (1-20)
- **Queue-Based Processing**: Intelligent job distribution with retry mechanism
- **Shared Data Caching**: Pre-fetch stable data (projects, environments, API tests)
- **Memory Management**: Automatic cleanup and memory monitoring
- **Progress Tracking**: Real-time progress with ETA calculations

### Processing Options
- **Raw Data**: Always extracted (execution, journey, project data)
- **NLP Conversion**: Natural language processing conversion
- **Variable Extraction**: Extract test data variables and environment values
- **Validation**: Comprehensive accuracy validation and error detection

### Output Formats
- **JSON**: Structured data export (default)
- **CSV**: Spreadsheet-compatible export
- **Summary Reports**: Detailed extraction statistics and performance metrics

## 🛠️ Installation & Setup

### Prerequisites
```bash
# Ensure you have Node.js installed
node --version  # Should be v14 or higher

# Ensure credentials are configured
ls config/v10-credentials.json
```

### Make Executable
```bash
chmod +x extract-bulk.js
```

## 📖 Usage Guide

### Basic Usage

```bash
# Extract last 30 days from project 4889
node extract-bulk.js --project 4889

# Extract specific execution IDs
node extract-bulk.js --project 4889 --executions "173822,173819,173818"

# Extract last 7 days with full processing
node extract-bulk.js --project 4889 --days 7 --all
```

### Advanced Usage

```bash
# High-performance extraction with 15 workers
node extract-bulk.js --project 4889 --workers 15 --all

# Extract specific date range
node extract-bulk.js --project 4889 --date-from 2025-08-01 --date-to 2025-08-13

# Filter by specific goals
node extract-bulk.js --project 4889 --goals "Demo,Admin Section"

# Generate CSV export
node extract-bulk.js --project 4889 --format csv

# Dry run to preview what would be extracted
node extract-bulk.js --project 4889 --days 7 --dry-run
```

### Performance Tuning

```bash
# Maximum performance for large datasets
node extract-bulk.js --project 4889 --workers 20 --rate-limit 100 --max-memory 1000

# Conservative settings for stability
node extract-bulk.js --project 4889 --workers 5 --rate-limit 25 --max-memory 250
```

## 🎯 Command Line Options

### Required
- `--project, -p <id>` - Project ID to extract executions from

### Date Range (choose one)
- `--days, -d <days>` - Extract last N days (default: 30)
- `--date-from <date>` - Start date (YYYY-MM-DD)
- `--date-to <date>` - End date (YYYY-MM-DD)

### Filtering
- `--goals <goal1,goal2>` - Extract specific goals (comma-separated)
- `--executions <id1,id2>` - Extract specific execution IDs (comma-separated)

### Processing
- `--workers, -w <count>` - Parallel workers (default: 10, max: 20)
- `--nlp` - Generate NLP conversion
- `--vars` - Extract variables
- `--validate` - Run validation
- `--all` - Enable nlp + vars + validate (recommended)

### Output
- `--output, -o <dir>` - Output directory (default: bulk-extractions)
- `--format <type>` - Export format: json, csv, both (default: json)

### Performance
- `--max-memory <mb>` - Max memory usage in MB (default: 500)
- `--rate-limit <rps>` - API requests per second (default: 50)
- `--retries <count>` - Retry attempts for failures (default: 3)

### Control
- `--resume` - Resume interrupted extraction
- `--dry-run` - Preview what would be extracted
- `--debug` - Show detailed progress and timing
- `--help, -h` - Show help message

## 📊 Performance Analysis

### Single Extraction Baseline
- **API Calls**: ~336ms
- **Processing**: ~14ms
- **Total**: ~350ms per execution

### Bulk Extraction Performance
| Workers | 100 Executions | 1000 Executions | Speed Improvement |
|---------|---------------|-----------------|-------------------|
| 1       | 35 seconds    | 350 seconds     | 1x (baseline)     |
| 5       | 7 seconds     | 70 seconds      | 5x                |
| 10      | 3.5 seconds   | 35 seconds      | 10x               |
| 15      | 2.3 seconds   | 23 seconds      | 15x               |
| 20      | 1.8 seconds   | 18 seconds      | 19x               |

### Memory Usage
- **Shared Cache**: ~5-20MB (project, environments, API tests)
- **Per Worker**: ~2-5MB
- **Total**: <500MB for 20 workers + thousands of executions

## 🏗️ Architecture Overview

```
extract-bulk.js (CLI Entry Point)
├── core/bulk-extractor.js (Orchestration)
│   ├── Execution Discovery (API endpoints)
│   ├── Shared Cache Building (stable data)
│   ├── Worker Pool Management
│   └── Results Aggregation
├── core/worker-pool.js (Parallel Processing)
│   ├── Queue-Based Job Distribution
│   ├── Rate Limiting Protection
│   ├── Error Retry Mechanism
│   └── Progress Tracking
└── extract-v10.js (Core Extraction)
    ├── Single Execution Processing
    ├── NLP Conversion
    ├── Variable Extraction
    └── Validation
```

### Optimization Strategy

1. **Shared Data Caching**: Pre-fetch stable data once (projects, environments, API tests)
2. **Parallel API Calls**: Independent executions processed simultaneously
3. **Queue Management**: Intelligent job distribution with retry logic
4. **Rate Limiting**: Protect against API throttling
5. **Memory Management**: Automatic cleanup and monitoring

## 📁 Output Structure

```
bulk-extractions/
└── bulk-session-2025-08-13T10-30-45/
    ├── bulk-extraction-summary.json    # Complete session summary
    ├── bulk-extraction-results.csv     # CSV export (if requested)
    └── [Individual extraction folders] # Standard V10 folder structure
        ├── Organization Name/
        │   └── Project Name/
        │       └── Goal Name/
        │           └── 2025-08-13/
        │               └── Journey-ExecutionId/
        │                   ├── raw_data/
        │                   ├── execution.nlp.txt
        │                   ├── variables.json
        │                   └── validation_report.json
```

## 📈 Reports & Analytics

### Bulk Extraction Summary
```json
{
  "bulk_extraction": {
    "session_id": "bulk-session-2025-08-13T10-30-45",
    "project_id": "4889",
    "configuration": {
      "workers": 10,
      "processing": { "nlp": true, "vars": true, "validate": true }
    }
  },
  "performance": {
    "total_time_ms": 35000,
    "total_extractions": 1000,
    "successful": 995,
    "failed": 5,
    "success_rate": 99.5,
    "extractions_per_second": 28.6
  },
  "shared_cache": {
    "size_mb": 15.2,
    "environments": 12,
    "api_tests": 45,
    "goals": 8
  }
}
```

### CSV Export Format
```csv
execution_id,goal_name,journey_name,status,duration_ms,extraction_status,output_path,error_message,timestamp
173822,"Demo","Demo Test",success,342,completed,"/path/to/output","",2025-08-13T10:30:45Z
173819,"Demo","Demo Test 2",failed,,error,"","API timeout",2025-08-13T10:30:46Z
```

## 🔧 Troubleshooting

### Common Issues

#### 1. API Endpoint Discovery Failed
```bash
# Error: Could not fetch execution list from any API endpoint
# Solution: Use specific execution IDs
node extract-bulk.js --project 4889 --executions "173822,173819,173818"
```

#### 2. Rate Limiting
```bash
# Error: Too many API requests
# Solution: Reduce workers and rate limit
node extract-bulk.js --project 4889 --workers 5 --rate-limit 25
```

#### 3. Memory Issues
```bash
# Error: JavaScript heap out of memory
# Solution: Reduce max memory and workers
node extract-bulk.js --project 4889 --workers 5 --max-memory 250
```

#### 4. Incomplete Extractions
```bash
# Solution: Use resume functionality
node extract-bulk.js --project 4889 --resume
```

### Debug Mode
```bash
# Enable detailed logging
node extract-bulk.js --project 4889 --debug

# Check configuration
node test-bulk-extractor.js
```

## 🧪 Testing

### Test Suite
```bash
# Run comprehensive test suite
node test-bulk-extractor.js

# Test specific scenarios
node extract-bulk.js --project 4889 --executions "173822" --dry-run --debug
```

### Performance Benchmarking
```bash
# Benchmark different worker counts
for workers in 1 5 10 15 20; do
  echo "Testing $workers workers..."
  time node extract-bulk.js --project 4889 --executions "173822,173819,173818" --workers $workers
done
```

## 📋 API Endpoints Used

### Execution Discovery
- `GET /goals/metrics/executions` - Primary execution list endpoint
- `GET /projects/metrics/executions` - Fallback execution list
- `GET /goals/metrics/executions/history` - Historical execution data

### Shared Data Caching
- `GET /projects/{id}` - Project metadata
- `GET /organizations/{id}` - Organization metadata
- `GET /projects/{id}/environments` - Environment configurations
- `GET /api-tests` - API test definitions
- `GET /goals/{id}` - Goal metadata

### Individual Extraction (per execution)
- `GET /testsuites/{id}` or `/projects/{pid}/journeys/{jid}` - Journey data
- `GET /executions/{id}` - Execution data
- `GET /goals/{id}` - Goal data (if not cached)

## 🔮 Future Enhancements

### Planned Features
- **Incremental Extraction**: Only extract new executions since last run
- **Database Integration**: Store results in database for querying
- **Web Dashboard**: Real-time monitoring and control interface
- **Distributed Processing**: Scale across multiple machines
- **Smart Scheduling**: Automatic extraction scheduling

### Performance Improvements
- **Connection Pooling**: Reuse HTTP connections
- **Compression**: Reduce memory usage for large datasets
- **Streaming**: Process results without loading everything in memory
- **Caching Persistence**: Save cache between sessions

## 📞 Support

### Getting Help
1. Check this guide for common issues
2. Run test suite: `node test-bulk-extractor.js`
3. Use debug mode: `--debug`
4. Check configuration: `config/v10-credentials.json`

### Performance Issues
1. Reduce worker count: `--workers 5`
2. Lower rate limit: `--rate-limit 25`
3. Decrease memory limit: `--max-memory 250`
4. Use dry run to estimate: `--dry-run`

The Virtuoso Bulk Extractor transforms the task of extracting thousands of executions from hours to minutes, making large-scale data analysis practical and efficient.
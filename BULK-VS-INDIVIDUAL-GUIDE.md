# Individual vs Bulk Extraction Guide

## 🚨 CRITICAL DISTINCTION

**The Virtuoso API extractor has TWO COMPLETELY SEPARATE systems:**

1. **Individual Extraction** (`extract-v10.js`) - For single executions
2. **Bulk Extraction** (`extract-bulk.js`) - For handling hundreds/thousands with re-execution intelligence

**DO NOT CONFUSE THEM** - They use different folder structures, different logic, and serve different purposes.

---

## When to Use Which Tool

### 🎯 Use Individual Extraction (`extract-v10.js`) When:
- **Testing a single journey execution**
- **Debugging a specific execution**
- **Need detailed analysis of one execution**
- **Prototyping or development**
- **Wanting simple folder structure**

```bash
# Individual extraction - simple and focused
node extract-v10.js https://app2.virtuoso.qa/#/project/4889/execution/173822/journey/527256 --all
```

### 🔄 Use Bulk Extraction (`extract-bulk.js`) When:
- **Journey runs 100+ times (re-executions)**
- **Need trend analysis across time**
- **Storage efficiency is important**
- **Want failure pattern clustering**
- **Need comprehensive reporting**
- **Analyzing test stability**

```bash
# Bulk extraction - intelligent and comprehensive
node extract-bulk.js --project 4889 --strategy smart --all
```

---

## Key Differences

| Aspect | Individual Extraction | Bulk Extraction |
|--------|----------------------|-----------------|
| **Purpose** | Single execution analysis | Re-execution intelligence |
| **Folder Structure** | `extractions/{org}/{project}/{goal}/{date}/{journey-exec}/` | `bulk-extractions/{org}/{project}/{session}/by-journey/` |
| **Re-execution Handling** | ❌ None - creates duplicate folders | ✅ Smart strategies prevent bloat |
| **Failure Analysis** | ❌ Per-execution only | ✅ Pattern clustering |
| **Trend Analysis** | ❌ None | ✅ Journey stability over time |
| **Storage Efficiency** | ❌ Stores everything | ✅ Configurable strategies |
| **Reporting** | Basic extraction summary | Comprehensive journey insights |
| **Performance** | Optimized for single execution | Optimized for parallel bulk processing |

---

## Folder Structure Comparison

### Individual Extraction Structure
```
extractions/
└── I-am-tech/
    └── iPermit Testing/
        └── Demo/
            └── 2025-08-13/
                └── Demo Test-173822/
                    ├── execution.nlp.txt
                    ├── variables.json
                    ├── validation_report.json
                    └── raw_data/
                        ├── journey.json
                        ├── execution.json
                        └── ...
```

### Bulk Extraction Structure
```
bulk-extractions/
└── I-am-tech/
    └── iPermit Testing/
        └── session-2025-08-13T10-30-00/
            ├── session-summary.json (comprehensive analysis)
            ├── by-journey/
            │   └── Demo Test/
            │       ├── execution-history.json (all 100 executions)
            │       ├── latest-success/ (most recent successful)
            │       ├── unique-failures/ (clustered failure patterns)
            │       └── metrics.json (trends, success rates)
            ├── by-date/
            │   └── 2025-08-13/
            │       ├── Demo Test-173822/
            │       ├── Demo Test-173823/
            │       └── ...
            └── aggregates/
                ├── journey-aggregates.json
                ├── reexecution-analysis.json
                └── journey-trends.json
```

---

## Bulk Extraction Strategies

### 🧠 Smart Strategy (Recommended)
**Best for: Most use cases with re-executions**
- Keeps latest successful execution
- Stores unique failure patterns only
- Prevents storage bloat while preserving insights

```bash
node extract-bulk.js --project 4889 --strategy smart
```

### 📦 All Strategy
**Best for: Complete historical record (like individual extractions)**
- Stores every single execution
- Use with caution for journeys with many re-executions
- Can create large storage usage

```bash
node extract-bulk.js --project 4889 --strategy all
```

### 🚨 Failures Strategy  
**Best for: Debugging problematic journeys**
- Only keeps failed executions
- Perfect for troubleshooting unstable tests

```bash
node extract-bulk.js --project 4889 --strategy failures
```

### 📊 Latest-N Strategy
**Best for: Trend analysis with limited storage**
- Keeps last N executions per journey
- Good balance between history and storage

```bash
node extract-bulk.js --project 4889 --strategy latest-n --latest-n 10
```

### 📅 Daily Strategy
**Best for: Long-term monitoring**
- One execution per day per journey
- Excellent for tracking stability over months

```bash
node extract-bulk.js --project 4889 --strategy daily --days 90
```

### 🔄 Changes Strategy
**Best for: Regression detection**
- Only stores when execution outcome changes
- Ideal for CI/CD pipeline monitoring

```bash
node extract-bulk.js --project 4889 --strategy changes
```

---

## Example Scenarios

### Scenario 1: Single Execution Investigation
**Problem:** "Execution 173822 failed, I need to debug it"
**Solution:** Use individual extraction
```bash
node extract-v10.js https://app2.virtuoso.qa/#/project/4889/execution/173822/journey/527256 --all
```

### Scenario 2: Journey Runs 50+ Times Per Day
**Problem:** "Demo Test journey keeps failing intermittently"
**Solution:** Use bulk extraction with smart strategy
```bash
node extract-bulk.js --project 4889 --goals "Demo" --strategy smart --days 7
```

### Scenario 3: Monthly Stability Report
**Problem:** "Need to track all journey stability trends"
**Solution:** Use bulk extraction with daily strategy
```bash
node extract-bulk.js --project 4889 --strategy daily --days 30 --format csv
```

### Scenario 4: CI/CD Regression Detection
**Problem:** "Want to detect when journeys start failing"
**Solution:** Use bulk extraction with changes strategy
```bash
node extract-bulk.js --project 4889 --strategy changes --days 7
```

---

## Performance Characteristics

### Individual Extraction
- **Throughput:** ~1 execution per 350ms
- **Best Use:** Single execution deep dive
- **Caching:** Optimized for single extraction with project/environment caching
- **Memory:** Low memory usage (~50MB)

### Bulk Extraction  
- **Throughput:** ~10 executions per second (with 10 workers)
- **Best Use:** Hundreds/thousands of executions
- **Caching:** Shared data caching across all extractions
- **Memory:** Configurable (default 500MB limit)
- **Speed Improvement:** 10x faster than running individual extractions sequentially

---

## Decision Flow Chart

```
Need to extract Virtuoso data?
│
├─ Single execution? 
│  └─ YES → Use extract-v10.js
│
└─ Multiple executions?
   │
   ├─ < 10 executions?
   │  └─ Use extract-v10.js (run multiple times)
   │
   └─ 10+ executions OR journey re-executions?
      └─ Use extract-bulk.js with appropriate strategy
```

---

## Migration Guide

### From Individual to Bulk
If you've been running individual extractions for journeys with many re-executions:

1. **Identify re-executed journeys** in your `extractions/` folder
2. **Choose appropriate strategy** based on your needs
3. **Run bulk extraction** with the same date range
4. **Compare results** to ensure you get the insights you need
5. **Archive or remove** old individual extractions if desired

### From Bulk to Individual
If you need detailed analysis of a specific execution found in bulk results:

1. **Find the execution ID** in bulk reports
2. **Construct the individual URL** 
3. **Run individual extraction** for detailed analysis

---

## Best Practices

### ✅ DO
- Use individual extraction for single execution debugging
- Use bulk extraction for re-execution analysis
- Choose the right strategy based on your storage vs insight needs
- Review bulk reports for journey stability insights
- Use CSV exports for external analysis tools

### ❌ DON'T
- Run individual extraction for journeys with 20+ re-executions
- Use "all" strategy without considering storage implications
- Confuse the two folder structures
- Try to mix outputs from both systems
- Ignore the comprehensive reports from bulk extraction

---

## Troubleshooting

### "I have duplicate folders in extractions/"
**Cause:** Using individual extraction for re-executed journeys  
**Solution:** Switch to bulk extraction with smart strategy

### "Bulk extraction takes too much storage"
**Cause:** Using "all" strategy for highly re-executed journeys  
**Solution:** Switch to "smart", "latest-n", or "failures" strategy

### "I can't find detailed analysis for a specific execution"
**Cause:** Bulk extraction may have filtered it based on strategy  
**Solution:** Run individual extraction for that specific execution URL

### "Journey trends show instability"
**Cause:** Actual journey instability detected by bulk intelligence  
**Solution:** Investigate using failure pattern clustering in bulk results

---

## Summary

**Remember:** These are TWO DIFFERENT TOOLS for TWO DIFFERENT PURPOSES:

- **`extract-v10.js`** = Individual execution deep dive
- **`extract-bulk.js`** = Re-execution intelligence and journey insights

Choose the right tool for your specific needs, and leverage the sophisticated re-execution handling when dealing with journeys that run multiple times.
# V10.6 Quick Reference Guide

## 🚀 Latest Production Script
**Use:** `extract-v10.js` (Version 10.6.0)

## 📋 Common Commands

### Standard Extraction (Recommended)
```bash
node extract-v10.js <virtuoso-url> --all
```
Extracts NLP, variables, and validation report with smart caching enabled.

### Quick Raw Data Only
```bash
node extract-v10.js <virtuoso-url>
```
Fastest option - saves raw JSON data for later processing.

### Debug Mode (No Cache)
```bash
node extract-v10.js <virtuoso-url> --all --fresh --debug
```
Forces fresh data fetch with detailed timing metrics.

## 🎯 Available Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--nlp` | Generate NLP conversion | Off |
| `--vars` | Extract variables | Off |
| `--validate` | Create validation report | Off |
| `--all` | Enable nlp+vars+validate | Off |
| `--offline` | Use cached raw data | Off |
| `--debug` | Show timing & cache stats | Off |
| `--fresh` | Force fresh data (no cache) | Off |
| `--no-cache` | Disable all caching | Off |

## ⚡ Performance Features (V10.6)
- **Smart Caching**: Enabled by default (30min project/env, 60min API tests)
- **Parallel Processing**: API calls and extraction run concurrently
- **Memory Management**: 100MB cache limit with LRU eviction
- **Multi-tenant Ready**: Cache isolation by org/project

## 🔧 Key Improvements by Version

| Version | Feature | Impact |
|---------|---------|--------|
| V10.6 | Performance-first caching | 50-80% faster |
| V10.5 | Failed execution handling | Error context preserved |
| V10.4 | Environment inheritance | Parent/child env vars |
| V10.3 | Execution-specific envs | Correct env selection |
| V10.2 | Critical env fix | Accurate variable values |
| V10.1 | Variable type detection | LOCAL vs ENVIRONMENT |

## 📊 Output Files

```
extractions/
└── {project_name}_{project_id}/
    └── {goal_name}_{goal_id}/
        └── {timestamp}_execution_{exec_id}/
            └── {journey_name}_{journey_id}/
                ├── raw_data/          # Always created
                │   ├── journey.json
                │   ├── execution.json
                │   ├── project.json
                │   └── environments.json
                ├── nlp.txt            # With --nlp
                ├── variables.json     # With --vars
                └── validation.json    # With --validate
```

## 🏢 Multi-Organization Usage
The script automatically handles multiple organizations/projects with isolated caching:
- Cache keys: `org{id}_project_{id}_environments`
- No data leakage between organizations
- Scales to 100s of projects

## 💡 Tips
1. Use `--all` for comprehensive extraction
2. Cache speeds up multiple extractions from same project
3. Use `--fresh` when debugging data issues
4. Raw data is always saved for offline reprocessing
5. Failed executions show error annotations in NLP
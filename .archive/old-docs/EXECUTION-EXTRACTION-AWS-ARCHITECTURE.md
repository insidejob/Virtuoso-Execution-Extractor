# 📊 Virtuoso Execution Extraction Process - AWS Architecture

## 🎯 Current Approach

Based on our implementation, here's the execution extraction process we've built:

### 1. Data Extraction Pipeline

```
Customer Virtuoso Instance
         ↓
    API Extraction
         ↓
    Raw JSON Data
         ↓
     AWS Storage
```

### 2. What We Extract

#### Per Execution:
```javascript
{
  "execution": {
    "id": 88715,
    "status": "FINISHED",
    "duration": 14525,
    "startDate": "2024-07-16T10:25:00Z",
    "endDate": "2024-07-16T10:30:00Z"
  },
  "journey": {
    "id": 527211,
    "name": "Suite 18",
    "title": "iPermit Add Isolation Question",
    "steps": [...],      // All test steps
    "checkpoints": [...]  // All checkpoints
  },
  "testData": {
    "variables": {...},   // All test data used
    "environment": {...}  // Environment configuration
  },
  "results": {
    "passed": 15,
    "failed": 0,
    "skipped": 0
  }
}
```

### 3. Extraction Methods

#### A. API-Based Extraction (Primary)
```javascript
// For each customer
const extractExecutionData = async (customerId, executionId) => {
  const config = getCustomerConfig(customerId);
  
  // Extract execution metadata
  const execution = await api.get(`/executions/${executionId}`);
  
  // Extract journey details
  const journey = await api.get(`/testsuites/${execution.journeyId}`);
  
  // Extract test data
  const testData = execution.meta.initialDataPerJourneySequence;
  
  // Extract environment
  const environment = await api.get(`/projects/${projectId}/environments`);
  
  return {
    customerId,
    extractedAt: new Date().toISOString(),
    execution,
    journey,
    testData,
    environment
  };
};
```

#### B. Multi-Customer Batch Process
```javascript
// Batch extraction for all customers
const batchExtract = async () => {
  const customers = await getActiveCustomers();
  
  for (const customer of customers) {
    const executions = await getRecentExecutions(customer);
    
    for (const execution of executions) {
      const data = await extractExecutionData(customer.id, execution.id);
      await storeInAWS(data);
    }
  }
};
```

## 🔐 AWS Storage Architecture

### Option 1: S3 + Athena (Recommended)
```
S3 Bucket Structure:
s3://virtuoso-executions/
  ├── customer-001/
  │   ├── 2024/07/16/
  │   │   ├── execution-88715.json
  │   │   ├── execution-88716.json
  │   │   └── metadata.json
  │   └── index/
  │       └── executions.parquet
  ├── customer-002/
  └── _schemas/
      └── execution-v1.json
```

**Benefits:**
- Cost-effective for large volumes
- Serverless querying with Athena
- Easy partitioning by date/customer
- Native JSON support

### Option 2: DynamoDB + S3
```
DynamoDB (Metadata):
- Table: virtuoso-executions
- Partition Key: customerId
- Sort Key: executionId
- Attributes: status, date, duration

S3 (Raw Data):
- Full execution JSON
- Screenshots
- Logs
```

### Option 3: RDS PostgreSQL
```sql
CREATE TABLE executions (
  id UUID PRIMARY KEY,
  customer_id VARCHAR(50),
  execution_id INTEGER,
  execution_data JSONB,
  created_at TIMESTAMP,
  INDEX idx_customer_date (customer_id, created_at)
);
```

## 🔒 Security Implementation

### 1. Customer Authentication
```javascript
// Each customer has unique credentials
const customerConfigs = {
  'customer-001': {
    apiUrl: 'https://api-customer1.virtuoso.qa',
    token: await getFromSecretsManager('virtuoso/customer-001/token'),
    sessionId: await getFromSecretsManager('virtuoso/customer-001/session')
  }
};
```

### 2. AWS Security
```yaml
# Secrets Manager for credentials
- Customer API tokens
- Session IDs
- Database passwords

# IAM Roles
- Lambda execution role
- S3 read/write permissions
- Secrets Manager access

# Encryption
- S3: SSE-S3 or SSE-KMS
- RDS: Encrypted at rest
- Transit: TLS 1.2+
```

## 📋 Proposed Lambda Architecture

```javascript
// Lambda function for extraction
exports.handler = async (event) => {
  const { customerId, executionId } = event;
  
  // Get customer config from Secrets Manager
  const config = await getCustomerSecrets(customerId);
  
  // Extract data
  const data = await extractExecutionData(config, executionId);
  
  // Store in S3
  const s3Key = `${customerId}/${date}/${executionId}.json`;
  await s3.putObject({
    Bucket: 'virtuoso-executions',
    Key: s3Key,
    Body: JSON.stringify(data),
    ServerSideEncryption: 'AES256'
  });
  
  // Update DynamoDB index
  await dynamodb.putItem({
    TableName: 'execution-index',
    Item: {
      customerId,
      executionId,
      s3Location: s3Key,
      extractedAt: new Date().toISOString()
    }
  });
  
  return { success: true, location: s3Key };
};
```

## 🚀 Deployment Options

### 1. Scheduled Batch (EventBridge + Lambda)
```yaml
Schedule: rate(1 hour)
Target: Lambda function
Purpose: Extract new executions hourly
```

### 2. Event-Driven (Webhooks)
```javascript
// API Gateway endpoint
POST /webhook/execution-complete
{
  "customerId": "001",
  "executionId": 88715
}
→ Triggers Lambda extraction
```

### 3. On-Demand (Step Functions)
```
StateMachine:
  1. List Customers
  2. For Each Customer:
     a. Get Executions
     b. Extract Data
     c. Store in S3
  3. Generate Report
```

## ❓ Questions Before Implementation

### 1. Data Scope
- Which specific data fields are required?
- Do you need screenshots/logs or just metadata?
- Historical data migration needed?

### 2. Scale & Performance
- How many customers?
- How many executions per customer per day?
- Acceptable extraction latency?

### 3. Storage & Retention
- Preferred AWS services (S3, RDS, DynamoDB)?
- Data retention policy?
- Compliance requirements (GDPR, SOC2)?

### 4. Access Patterns
- Who will query this data?
- Real-time access needed?
- Reporting/analytics requirements?

### 5. Customer Configuration
- How do we get customer credentials?
- Self-service onboarding?
- Multi-tenant or isolated storage?

## 📊 Recommended Architecture

Based on typical requirements:

```
Architecture: Serverless
Extraction: Lambda functions
Storage: S3 (raw) + DynamoDB (index)
Security: Secrets Manager + IAM
Scheduling: EventBridge
Monitoring: CloudWatch
Query: Athena for analytics
```

**Monthly Cost Estimate (100 customers, 1000 executions/day):**
- Lambda: ~$50
- S3: ~$100
- DynamoDB: ~$25
- Secrets Manager: ~$40
- Total: ~$215/month

## 🎯 Next Steps

1. **Confirm Requirements**
   - Data fields needed
   - Customer count
   - Security requirements

2. **Choose Storage Strategy**
   - S3 + Athena (analytics)
   - DynamoDB (real-time)
   - RDS (complex queries)

3. **Setup AWS Infrastructure**
   - Create S3 buckets
   - Configure IAM roles
   - Setup Secrets Manager

4. **Deploy Extraction Pipeline**
   - Lambda functions
   - EventBridge schedules
   - Monitoring alerts

Would you like me to elaborate on any specific aspect of this architecture?
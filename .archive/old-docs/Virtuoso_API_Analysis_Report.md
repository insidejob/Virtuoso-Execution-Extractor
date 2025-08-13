# Virtuoso API Collections Analysis Report

## Overview
This report analyzes two Postman collections for the Virtuoso API platform and provides a unified collection structure focusing on journey/testsuite management.

## Source Collections Analyzed

### 1. Virtuoso API Collection.postman_collection.json
- **Collection ID**: d1ad7c77-a8cd-4b61-a17d-27e03bcecb26
- **Name**: Virtuoso API Collection
- **Primary Focus**: Complete API workflow including project creation, goal management, journey/testsuite operations, and step management
- **Size**: ~36,732 tokens

### 2. apis_1.postman_collection.json
- **Collection ID**: 9e61a929-4562-4465-afca-f5f1b530e9a0
- **Name**: apis_1
- **Primary Focus**: Comprehensive API endpoints covering execution management, advanced step examples, and analytics
- **Size**: ~76,295 tokens

## Base URLs Identified

### Primary Base URL
- **Production**: `https://api-app2.virtuoso.qa`
- Used consistently across both collections

### Variable Patterns
- `{{baseURL}}` - Used in Virtuoso API Collection
- `{{baseUrl}}` - Used in apis_1 collection
- `{{BASE_URL}}` - Used in some endpoints in apis_1 collection

## Authentication Methods

### Bearer Token Authentication
- **Primary Method**: Bearer tokens via Authorization header
- **Format**: `Bearer {{auth_token}}`
- **Usage**: Most endpoints require authentication

### Client Headers
- **X-Virtuoso-Client-ID**: Required for API identification
- **X-Virtuoso-Client-Name**: Typically "Virtuoso UI" or custom client name

## Unique Endpoints Analysis

### Journey/TestSuite Related Endpoints (FOCUS AREA)

#### Core Journey Management
1. **GET** `/testsuites/latest_status` - Get journey status with execution details
2. **POST** `/testsuites` - Create new journey/testsuite
3. **GET** `/testsuites/{journeyId}` - Get specific journey details including checkpoints and steps
4. **GET** `/testsuites/{journeyId}/history` - Get journey execution history
5. **POST** `/testsuites/execution` - Execute journey with specific parameters
6. **GET** `/testsuites/{journeyId}/checkpoints/attach` - Attach checkpoints to journeys

#### Checkpoint Management
1. **POST** `/testcases` - Create new checkpoint (testcase)
2. **POST** `/testsuites/{journeyId}/checkpoints/attach` - Attach checkpoint to journey at specific position
3. **POST** `/testcases/{checkpointId}/add-to-library` - Add checkpoint to reusable library

#### Step Management
1. **POST** `/teststeps` - Create test steps within checkpoints
2. **GET** `/teststeps/{stepId}` - Get specific step details
3. **PUT** `/teststeps/{stepId}` - Update existing step
4. **GET** `/teststeps/{stepId}/properties` - Get step properties
5. **GET** `/timelines/journeys/{journeyId}/checkpoints/{checkpointId}/steps/{stepId}` - Get step execution timeline

### All Unique Endpoints (Comprehensive List)

#### Project & Goal Management
- `POST /projects` - Create project
- `GET /projects` - List projects
- `GET /projects/{projectId}/goals` - Get project goals
- `POST /goals` - Create goal
- `GET /goals/{goalId}` - Get goal details
- `GET /goals/{goalId}/versions` - Get goal versions/snapshots

#### Execution Management
- `POST /goals/{goalId}/snapshots/{snapshotId}/execute` - Execute goal
- `GET /jobs/{executionId}/status` - Get execution status
- `GET /executions/analysis/{executionId}` - Get execution analysis
- `GET /executions/{executionId}/failures/explain` - Get AI failure analysis

#### Test Data Management
- `POST /testdata/tables/create` - Create test data table
- `GET /testdata/tables/{tableId}` - Get table details
- `POST /testdata/tables/{tableId}/import` - Import data to table
- `POST /testdata/tables/clone` - Clone existing table

#### API Testing
- `GET /api-tests` - List API tests
- `POST /api-tests/apis` - Create API test
- `GET /api-tests/apis/{apiTestId}` - Get API test details
- `PUT /api-tests/apis/{apiTestId}` - Update API test

#### Environment Management
- `POST /environments/create` - Create environment
- `GET /environments/{environmentId}` - Get environment details
- `POST /environments/{environmentId}/variables` - Create environment variables

#### Extensions & Scripts
- `GET /scripts` - List extensions/scripts
- `POST /scripts` - Create extension
- `GET /scripts/{scriptId}` - Get script details
- `GET /projects/{projectId}/scripts` - Get project scripts

#### Element Healing & Analysis
- `GET /elements/healing` - Get element healing information
- `GET /tickets` - Get execution tickets/issues

## Journey 527286 Focus

### Specific Endpoints for Journey 527286
Based on the analysis, to extract checkpoints and steps from Journey 527286, use:

1. **Primary Endpoint**: `GET /testsuites/527286`
   - Returns complete journey structure including all checkpoints and steps
   - Contains checkpoint IDs, step sequences, and step details

2. **Detailed Step Information**: `GET /teststeps/{stepId}`
   - Use step IDs from journey details to get comprehensive step information
   - Includes step actions, selectors, values, and metadata

3. **Execution Timeline**: `GET /timelines/journeys/527286/checkpoints/{checkpointId}/steps/{stepId}`
   - Provides execution history and timeline data for specific steps

## Unified Collection Features

### Collection Structure
The unified collection organizes endpoints into logical groups:

1. **Project Management** - Project creation and listing
2. **Goal Management** - Goal operations and versions
3. **Journey Management** - Core focus area for testsuite operations
4. **Checkpoint Management** - Checkpoint creation and attachment
5. **Step Management** - Test step operations and details
6. **Execution Management** - Test execution and monitoring
7. **Test Data Management** - Test data tables and operations
8. **API Tests** - API testing capabilities
9. **Environment Management** - Environment and variable management

### Key Variables
- `baseURL` / `baseUrl` / `BASE_URL`: API base URL
- `auth_token`: Bearer authentication token
- `X-Virtuoso-Client-ID`: Client identification
- `X-Virtuoso-Client-Name`: Client name
- `envelope`: Response envelope flag

### Authentication
- Unified Bearer token authentication
- Client identification headers
- Consistent authentication across all endpoints

## Recommendations

### For Journey 527286 Analysis
1. Use `GET /testsuites/527286` to retrieve complete journey structure
2. Parse the response to extract checkpoint IDs and step details
3. Use individual step endpoints for detailed step information if needed
4. Consider execution timeline endpoints for historical data

### Collection Usage
1. Set up environment variables for base URL and authentication
2. Use the unified collection for consistent API access
3. Focus on Journey Management section for testsuite operations
4. Leverage the structured organization for efficient API testing

## Files Created
1. **Unified_Virtuoso_API_Collection.postman_collection.json** - Complete unified collection
2. **Virtuoso_API_Analysis_Report.md** - This analysis report

The unified collection provides a clean, organized structure for accessing all Virtuoso API endpoints with special emphasis on journey/testsuite management capabilities needed for Journey 527286 analysis.
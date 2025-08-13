#!/usr/bin/env python3

"""
Comprehensive Virtuoso API Extractor for Execution 88715
Handles authentication, retries, and fallback mechanisms
"""

import json
import requests
import time
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin

class VirtuosoComprehensiveExtractor:
    def __init__(self):
        # Configuration
        self.config = {
            'base_url': 'https://api-app2.virtuoso.qa/api',
            'ui_url': 'https://app2.virtuoso.qa',
            'token': '9e141010-eca5-43f5-afb9-20dc6c49833f',
            'execution_id': 88715,
            'journey_id': 527218,
            'project_id': 4889,
            'org_id': 1964
        }
        
        # Session with retries
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.config["token"]}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Organization-Id': str(self.config['org_id']),
            'User-Agent': 'Virtuoso-Comprehensive-Extractor/2.0'
        })
        
        # Results storage
        self.results = {
            'timestamp': datetime.utcnow().isoformat(),
            'config': self.config,
            'successful_endpoints': [],
            'failed_endpoints': [],
            'extracted_data': {},
            'structured_data': None
        }
        
        # All discovered endpoint patterns
        self.endpoints = [
            # Core execution endpoints
            {
                'path': f'/executions/{self.config["execution_id"]}',
                'name': 'execution',
                'description': 'Main execution data'
            },
            {
                'path': f'/executions/{self.config["execution_id"]}/journeys/{self.config["journey_id"]}',
                'name': 'execution_journey',
                'description': 'Execution journey combination'
            },
            {
                'path': f'/projects/{self.config["project_id"]}/executions/{self.config["execution_id"]}',
                'name': 'project_execution',
                'description': 'Project-scoped execution'
            },
            
            # Journey as TestSuite (critical pattern)
            {
                'path': f'/projects/{self.config["project_id"]}/testsuites/{self.config["journey_id"]}',
                'name': 'testsuite',
                'description': 'Journey as TestSuite'
            },
            {
                'path': f'/testsuites/{self.config["journey_id"]}',
                'name': 'testsuite_direct',
                'description': 'Direct TestSuite access'
            },
            
            # Detailed data
            {
                'path': f'/executions/{self.config["execution_id"]}/checkpoints',
                'name': 'checkpoints',
                'description': 'Execution checkpoints'
            },
            {
                'path': f'/executions/{self.config["execution_id"]}/steps',
                'name': 'steps',
                'description': 'Execution steps'
            },
            {
                'path': f'/projects/{self.config["project_id"]}/testsuites/{self.config["journey_id"]}/steps',
                'name': 'journey_steps',
                'description': 'Journey/TestSuite steps'
            },
            {
                'path': f'/executions/{self.config["execution_id"]}/actions',
                'name': 'actions',
                'description': 'Execution actions'
            },
            
            # Assets and results
            {
                'path': f'/executions/{self.config["execution_id"]}/screenshots',
                'name': 'screenshots',
                'description': 'Execution screenshots'
            },
            {
                'path': f'/executions/{self.config["execution_id"]}/logs',
                'name': 'logs',
                'description': 'Execution logs'
            },
            {
                'path': f'/executions/{self.config["execution_id"]}/results',
                'name': 'results',
                'description': 'Execution results'
            },
            {
                'path': f'/executions/{self.config["execution_id"]}/reports',
                'name': 'reports',
                'description': 'Execution reports'
            },
            
            # Test data
            {
                'path': f'/projects/{self.config["project_id"]}/testdata/{self.config["journey_id"]}',
                'name': 'testdata',
                'description': 'Journey test data'
            },
            {
                'path': f'/journeys/{self.config["journey_id"]}/metadata',
                'name': 'metadata',
                'description': 'Journey metadata'
            },
            
            # Organization endpoints
            {
                'path': f'/organizations/{self.config["org_id"]}/projects/{self.config["project_id"]}/executions/{self.config["execution_id"]}',
                'name': 'org_execution',
                'description': 'Organization-scoped execution'
            },
            
            # Additional patterns from Postman
            {
                'path': f'/v2/executions/{self.config["execution_id"]}',
                'name': 'v2_execution',
                'description': 'V2 API execution'
            },
            {
                'path': f'/runs/{self.config["execution_id"]}',
                'name': 'run',
                'description': 'Execution as run'
            },
            {
                'path': f'/test-runs/{self.config["execution_id"]}',
                'name': 'test_run',
                'description': 'Execution as test-run'
            }
        ]
    
    def make_request(self, endpoint: Dict[str, str], retry_count: int = 3) -> Optional[Dict[str, Any]]:
        """Make API request with retries and error handling"""
        url = urljoin(self.config['base_url'], endpoint['path'])
        
        for attempt in range(retry_count):
            try:
                print(f"\n📡 {endpoint['description']}")
                print(f"   URL: {url}")
                print(f"   Attempt: {attempt + 1}/{retry_count}")
                
                response = self.session.get(url, timeout=10)
                
                if response.status_code == 200:
                    print(f"   ✅ Success (HTTP {response.status_code})")
                    data = response.json()
                    self.results['successful_endpoints'].append(endpoint['name'])
                    self.results['extracted_data'][endpoint['name']] = data
                    return data
                    
                elif response.status_code == 401:
                    print(f"   🔐 Authentication failed")
                    if attempt == 0:
                        # Try alternative auth header
                        self.session.headers['X-Auth-Token'] = self.config['token']
                        continue
                        
                elif response.status_code == 404:
                    print(f"   ⚠️  Not found (HTTP 404)")
                    
                else:
                    print(f"   ⚠️  HTTP {response.status_code}")
                    
                if attempt < retry_count - 1:
                    time.sleep(1)  # Wait before retry
                    
            except requests.exceptions.Timeout:
                print(f"   ⏱️  Timeout")
                
            except requests.exceptions.ConnectionError:
                print(f"   ❌ Connection error")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
        
        self.results['failed_endpoints'].append({
            'name': endpoint['name'],
            'path': endpoint['path'],
            'description': endpoint['description']
        })
        return None
    
    def extract_all_data(self):
        """Extract data from all endpoints"""
        print("🚀 Comprehensive Virtuoso API Extraction")
        print("=" * 50)
        print(f"Execution: {self.config['execution_id']}")
        print(f"Journey: {self.config['journey_id']}")
        print(f"Project: {self.config['project_id']}")
        print("=" * 50)
        
        # Try all endpoints
        for endpoint in self.endpoints:
            self.make_request(endpoint)
        
        # Try GraphQL if REST fails
        if len(self.results['successful_endpoints']) < 3:
            self.try_graphql()
    
    def try_graphql(self):
        """Attempt GraphQL query as fallback"""
        print("\n🔷 Attempting GraphQL fallback")
        
        graphql_url = self.config['base_url'].replace('/api', '/graphql')
        
        query = """
        query GetExecutionData($executionId: ID!, $journeyId: ID!) {
            execution(id: $executionId) {
                id
                status
                startTime
                endTime
                journey(id: $journeyId) {
                    id
                    name
                    checkpoints {
                        id
                        name
                        steps {
                            id
                            action
                            selector
                            value
                            status
                            duration
                        }
                    }
                }
            }
        }
        """
        
        variables = {
            'executionId': self.config['execution_id'],
            'journeyId': self.config['journey_id']
        }
        
        try:
            response = self.session.post(
                graphql_url,
                json={'query': query, 'variables': variables},
                timeout=10
            )
            
            if response.status_code == 200:
                print("   ✅ GraphQL Success")
                self.results['extracted_data']['graphql'] = response.json()
                self.results['successful_endpoints'].append('graphql')
            else:
                print(f"   ⚠️  GraphQL failed (HTTP {response.status_code})")
                
        except Exception as e:
            print(f"   ❌ GraphQL error: {str(e)}")
    
    def structure_data(self):
        """Structure extracted data for NLP conversion"""
        print("\n📊 Structuring Data for NLP Conversion")
        print("=" * 50)
        
        structured = {
            'executionId': self.config['execution_id'],
            'journeyId': self.config['journey_id'],
            'projectId': self.config['project_id'],
            'checkpoints': []
        }
        
        # Priority order for data sources
        data_sources = [
            'checkpoints',
            'steps',
            'journey_steps',
            'testsuite',
            'execution_journey',
            'graphql'
        ]
        
        for source in data_sources:
            if source in self.results['extracted_data']:
                data = self.results['extracted_data'][source]
                
                if source == 'checkpoints' and data:
                    structured['checkpoints'] = data if isinstance(data, list) else [data]
                    print(f"✅ Used {source} for checkpoint data")
                    break
                    
                elif source == 'steps' and data:
                    steps = data if isinstance(data, list) else [data]
                    structured['checkpoints'] = [{
                        'name': 'Execution Steps',
                        'steps': steps
                    }]
                    print(f"✅ Used {source} for step data")
                    break
                    
                elif source == 'graphql' and data:
                    if 'data' in data and 'execution' in data['data']:
                        exec_data = data['data']['execution']
                        if 'journey' in exec_data and 'checkpoints' in exec_data['journey']:
                            structured['checkpoints'] = exec_data['journey']['checkpoints']
                            print(f"✅ Used {source} for checkpoint data")
                            break
        
        if structured['checkpoints']:
            self.results['structured_data'] = structured
            print(f"📋 Structured {len(structured['checkpoints'])} checkpoints")
        else:
            print("⚠️  No checkpoint/step data found for structuring")
        
        return structured
    
    def save_results(self):
        """Save extraction results to files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save raw results
        raw_filename = f'execution_{self.config["execution_id"]}_raw_{timestamp}.json'
        with open(raw_filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n💾 Raw data saved to: {raw_filename}")
        
        # Save structured data if available
        if self.results['structured_data']:
            structured_filename = f'execution_{self.config["execution_id"]}_structured_{timestamp}.json'
            with open(structured_filename, 'w') as f:
                json.dump(self.results['structured_data'], f, indent=2)
            print(f"💾 Structured data saved to: {structured_filename}")
            return structured_filename
        
        return raw_filename
    
    def generate_report(self):
        """Generate extraction report"""
        print("\n" + "=" * 50)
        print("📋 Extraction Report")
        print("=" * 50)
        
        print(f"\n✅ Successful endpoints: {len(self.results['successful_endpoints'])}")
        for endpoint in self.results['successful_endpoints']:
            print(f"   • {endpoint}")
        
        print(f"\n❌ Failed endpoints: {len(self.results['failed_endpoints'])}")
        for endpoint in self.results['failed_endpoints'][:5]:  # Show first 5
            print(f"   • {endpoint['name']}: {endpoint['description']}")
        
        if self.results['extracted_data']:
            print("\n📦 Extracted Data Summary:")
            for key, value in self.results['extracted_data'].items():
                if isinstance(value, (dict, list)):
                    size = len(json.dumps(value))
                    items = len(value) if isinstance(value, list) else len(value.keys())
                    print(f"   • {key}: {items} items, {size/1024:.1f} KB")
        
        print("\n🚀 Next Steps:")
        
        if self.results['structured_data']:
            print("1. ✅ Data successfully extracted and structured!")
            print("2. Run NLP converter:")
            print(f"   node ENHANCED-NLP-CONVERTER.js execution_{self.config['execution_id']}_structured_*.json")
        elif self.results['successful_endpoints']:
            print("1. ⚠️  Partial data extracted")
            print("2. Review raw data and manually structure if needed")
            print("3. Try browser extraction for complete data")
        else:
            print("1. ❌ API extraction failed - authentication issue likely")
            print("2. Use browser extraction fallback:")
            print(f"   - Navigate to: https://app2.virtuoso.qa/#/project/{self.config['project_id']}/execution/{self.config['execution_id']}/journey/{self.config['journey_id']}")
            print("   - Run extract-execution-88715.js in console")

def main():
    """Main execution"""
    extractor = VirtuosoComprehensiveExtractor()
    
    try:
        # Extract all data
        extractor.extract_all_data()
        
        # Structure for NLP
        extractor.structure_data()
        
        # Save results
        filename = extractor.save_results()
        
        # Generate report
        extractor.generate_report()
        
        # Return success/failure
        if extractor.results['structured_data']:
            print("\n✨ Extraction successful!")
            sys.exit(0)
        else:
            print("\n⚠️  Extraction incomplete - use fallback methods")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(2)

if __name__ == '__main__':
    main()
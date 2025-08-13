const https = require('https');
const fs = require('fs');
const path = require('path');

class VirtuosoAPIClient {
    constructor(token, options = {}) {
        // Initialize environment manager
        const EnvironmentManager = require('./environment-manager');
        this.envManager = new EnvironmentManager();
        
        // Get environment config (defaults to app2)
        const envConfig = this.envManager.getAPIConfig();
        
        this.token = token || envConfig.token;
        this.baseUrl = options.baseUrl || envConfig.baseUrl || 'https://app2.virtuoso.qa/api';
        this.timeout = options.timeout || 30000;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        // Check if we're using a non-demo environment
        if (!envConfig.isDemoEnvironment && !options.skipConfirmation) {
            console.log('⚠️  Using non-demo environment. Please use app2 for testing.');
        }
        
        // Load schema for validation
        this.schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'api-schema.json'), 'utf8'));
    }

    // Generic request method
    async request(method, path, options = {}) {
        const url = new URL(path, this.baseUrl);
        
        const requestOptions = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.timeout
        };

        if (options.body) {
            requestOptions.body = typeof options.body === 'string' 
                ? options.body 
                : JSON.stringify(options.body);
        }

        let lastError;
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await this._makeRequest(url.toString(), requestOptions);
                return this._parseResponse(response);
            } catch (error) {
                lastError = error;
                if (attempt < this.retryAttempts - 1) {
                    await this._delay(this.retryDelay * (attempt + 1));
                }
            }
        }
        
        throw lastError;
    }

    _makeRequest(url, options) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: options.method,
                headers: options.headers,
                timeout: options.timeout
            };

            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    _parseResponse(response) {
        const result = {
            status: response.status,
            headers: response.headers,
            data: null
        };

        if (response.body) {
            try {
                result.data = JSON.parse(response.body);
            } catch {
                result.data = response.body;
            }
        }

        if (response.status >= 400) {
            const error = new Error(`API Error: ${response.status}`);
            error.response = result;
            throw error;
        }

        return result;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // User endpoints
    async getUser() {
        return this.request('GET', '/user');
    }

    // Project endpoints
    async listProjects() {
        return this.request('GET', '/projects');
    }

    async listGoals(projectId) {
        return this.request('GET', `/projects/${projectId}/goals`);
    }

    async listJobs(projectId) {
        return this.request('GET', `/projects/${projectId}/jobs`);
    }

    async listSnapshots(projectId) {
        return this.request('GET', `/projects/${projectId}/snapshots`);
    }

    // Goal execution
    async executeGoal(goalId, options = {}) {
        const body = {};
        
        if (options.initialData) {
            body.initialData = options.initialData;
        }
        
        if (options.httpHeaders) {
            body.httpHeaders = options.httpHeaders;
        }
        
        if (options.startingUrl) {
            body.startingUrl = options.startingUrl;
        }

        return this.request('POST', `/goals/${goalId}/execute`, { body });
    }

    // Helper method to get all endpoints from schema
    getAvailableEndpoints() {
        const endpoints = [];
        
        Object.values(this.schema.categories).forEach(category => {
            if (category.endpoints) {
                category.endpoints.forEach(endpoint => {
                    endpoints.push({
                        id: endpoint.id,
                        name: endpoint.name,
                        method: endpoint.method,
                        path: endpoint.path,
                        category: category.name
                    });
                });
            }
        });
        
        return endpoints;
    }

    // Generate curl command for an endpoint
    generateCurl(endpointId, params = {}) {
        let endpoint = null;
        
        Object.values(this.schema.categories).forEach(category => {
            if (category.endpoints) {
                const found = category.endpoints.find(e => e.id === endpointId);
                if (found) endpoint = found;
            }
        });
        
        if (!endpoint) {
            throw new Error(`Endpoint ${endpointId} not found`);
        }

        let path = endpoint.path;
        
        // Replace path parameters
        if (params.pathParams) {
            Object.entries(params.pathParams).forEach(([key, value]) => {
                path = path.replace(`{${key}}`, value);
            });
        }

        let curl = `curl --header "Authorization: Bearer ${this.token}"`;
        
        if (endpoint.method !== 'GET') {
            curl += ` -X ${endpoint.method}`;
        }
        
        if (params.body) {
            curl += ` -H "Content-Type: application/json"`;
            curl += ` -d '${JSON.stringify(params.body)}'`;
        }
        
        curl += ` ${this.baseUrl}${path}`;
        
        return curl;
    }
}

// Testing extension functions (for use in test journeys)
class VirtuosoTestingExtensions {
    static async API_GET(url, headers = {}) {
        const options = {
            method: 'GET',
            headers: headers
        };
        
        return fetch(url, options).then(res => res.json());
    }

    static async API_POST(url, body, headers = {}) {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: typeof body === 'string' ? body : JSON.stringify(body)
        };
        
        return fetch(url, options).then(res => res.json());
    }

    static async API_PUT(url, body, headers = {}) {
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: typeof body === 'string' ? body : JSON.stringify(body)
        };
        
        return fetch(url, options).then(res => res.json());
    }

    static async API_DELETE(url, headers = {}) {
        const options = {
            method: 'DELETE',
            headers: headers
        };
        
        return fetch(url, options).then(res => {
            if (res.status === 204) {
                return { status: 204, message: 'Deleted successfully' };
            }
            return res.json();
        });
    }
}

module.exports = {
    VirtuosoAPIClient,
    VirtuosoTestingExtensions
};
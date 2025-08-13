#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class APISearcher {
    constructor() {
        this.schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'api-schema.json'), 'utf8'));
        this.searchIndex = this.buildSearchIndex();
    }

    buildSearchIndex() {
        const index = [];
        
        // Index platform endpoints
        Object.values(this.schema.categories).forEach(category => {
            if (category.endpoints) {
                category.endpoints.forEach(endpoint => {
                    index.push({
                        type: 'endpoint',
                        category: category.name,
                        id: endpoint.id,
                        name: endpoint.name,
                        method: endpoint.method,
                        path: endpoint.path || endpoint.function,
                        description: endpoint.description,
                        tags: endpoint.tags || [],
                        example: endpoint.example,
                        searchText: this.buildSearchText(endpoint, category.name)
                    });
                });
            }
            
            // Index API Manager features
            if (category.features) {
                category.features.forEach(feature => {
                    index.push({
                        type: 'feature',
                        category: category.name,
                        id: feature.id,
                        name: feature.name,
                        description: feature.description,
                        capabilities: feature.capabilities,
                        searchText: this.buildFeatureSearchText(feature, category.name)
                    });
                });
            }
        });
        
        return index;
    }

    buildSearchText(endpoint, categoryName) {
        const parts = [
            endpoint.id,
            endpoint.name,
            endpoint.method,
            endpoint.path || endpoint.function || '',
            endpoint.description,
            categoryName,
            ...(endpoint.tags || [])
        ];
        
        return parts.join(' ').toLowerCase();
    }

    buildFeatureSearchText(feature, categoryName) {
        const parts = [
            feature.id,
            feature.name,
            feature.description,
            categoryName,
            ...(feature.capabilities || [])
        ];
        
        return parts.join(' ').toLowerCase();
    }

    search(query, options = {}) {
        const normalizedQuery = query.toLowerCase();
        const words = normalizedQuery.split(/\s+/);
        
        let results = this.searchIndex.filter(item => {
            // Check if all query words are present
            return words.every(word => item.searchText.includes(word));
        });
        
        // Apply filters
        if (options.method) {
            results = results.filter(item => 
                item.method && item.method.toLowerCase() === options.method.toLowerCase()
            );
        }
        
        if (options.category) {
            results = results.filter(item => 
                item.category.toLowerCase().includes(options.category.toLowerCase())
            );
        }
        
        if (options.type) {
            results = results.filter(item => item.type === options.type);
        }
        
        // Score and sort results
        results = results.map(item => ({
            ...item,
            score: this.calculateScore(item, words)
        }));
        
        results.sort((a, b) => b.score - a.score);
        
        return options.limit ? results.slice(0, options.limit) : results;
    }

    calculateScore(item, queryWords) {
        let score = 0;
        
        queryWords.forEach(word => {
            // Exact match in ID or name
            if (item.id && item.id.toLowerCase().includes(word)) score += 10;
            if (item.name && item.name.toLowerCase().includes(word)) score += 8;
            
            // Match in method or path
            if (item.method && item.method.toLowerCase() === word) score += 7;
            if (item.path && item.path.toLowerCase().includes(word)) score += 6;
            
            // Match in tags
            if (item.tags && item.tags.some(tag => tag.toLowerCase().includes(word))) score += 5;
            
            // Match in description
            if (item.description && item.description.toLowerCase().includes(word)) score += 3;
            
            // Match in category
            if (item.category && item.category.toLowerCase().includes(word)) score += 2;
        });
        
        return score;
    }

    displayResult(item, verbose = false) {
        console.log('\n' + '='.repeat(80));
        console.log(`📌 ${item.name} (${item.category})`);
        console.log('─'.repeat(80));
        
        if (item.type === 'endpoint') {
            console.log(`Method: ${item.method}`);
            console.log(`Path: ${item.path}`);
            console.log(`Description: ${item.description}`);
            
            if (item.tags && item.tags.length > 0) {
                console.log(`Tags: ${item.tags.join(', ')}`);
            }
            
            if (verbose && item.example) {
                console.log('\n📝 Example:');
                
                if (item.example.curl) {
                    console.log('\nCURL:');
                    console.log(item.example.curl);
                }
                
                if (item.example.code) {
                    console.log('\nCode:');
                    console.log(item.example.code);
                }
                
                if (item.example.response) {
                    console.log('\nResponse:');
                    console.log(JSON.stringify(item.example.response, null, 2));
                }
            }
        } else if (item.type === 'feature') {
            console.log(`Description: ${item.description}`);
            
            if (item.capabilities && item.capabilities.length > 0) {
                console.log('\nCapabilities:');
                item.capabilities.forEach(cap => {
                    console.log(`  • ${cap}`);
                });
            }
        }
    }

    generateCurlCommand(endpoint, token = 'YOUR_TOKEN') {
        if (!endpoint.example || !endpoint.example.curl) {
            return `curl --header "Authorization: Bearer ${token}" ${this.schema.baseUrls.api}${endpoint.path}`;
        }
        
        return endpoint.example.curl.replace('$TOKEN', token);
    }

    interactiveSearch() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('🔍 Virtuoso API Quick Search');
        console.log('Commands: search <query>, filter <method>, category <name>, exit');
        console.log('─'.repeat(80));

        const prompt = () => {
            rl.question('\n> ', (input) => {
                const [command, ...args] = input.trim().split(/\s+/);
                
                switch(command.toLowerCase()) {
                    case 'search':
                    case 's':
                        const query = args.join(' ');
                        if (!query) {
                            console.log('Please provide a search query');
                        } else {
                            const results = this.search(query, { limit: 5 });
                            if (results.length === 0) {
                                console.log('No results found');
                            } else {
                                console.log(`\nFound ${results.length} results:`);
                                results.forEach(item => this.displayResult(item));
                            }
                        }
                        break;
                        
                    case 'filter':
                    case 'f':
                        const method = args[0];
                        if (!method) {
                            console.log('Please provide a method (GET, POST, PUT, DELETE)');
                        } else {
                            const results = this.search('', { method, limit: 10 });
                            console.log(`\nEndpoints with method ${method.toUpperCase()}:`);
                            results.forEach(item => this.displayResult(item));
                        }
                        break;
                        
                    case 'category':
                    case 'c':
                        const cat = args.join(' ');
                        if (!cat) {
                            console.log('Available categories:');
                            Object.values(this.schema.categories).forEach(category => {
                                console.log(`  • ${category.name}`);
                            });
                        } else {
                            const results = this.search('', { category: cat });
                            console.log(`\n${cat} endpoints:`);
                            results.forEach(item => this.displayResult(item));
                        }
                        break;
                        
                    case 'detail':
                    case 'd':
                        const id = args[0];
                        if (!id) {
                            console.log('Please provide an endpoint ID');
                        } else {
                            const item = this.searchIndex.find(i => i.id === id);
                            if (item) {
                                this.displayResult(item, true);
                                if (item.type === 'endpoint') {
                                    console.log('\n📋 Copy-paste ready CURL:');
                                    console.log(this.generateCurlCommand(item));
                                }
                            } else {
                                console.log('Endpoint not found');
                            }
                        }
                        break;
                        
                    case 'list':
                    case 'l':
                        console.log('\nAll available endpoints:');
                        this.searchIndex.filter(i => i.type === 'endpoint').forEach(item => {
                            console.log(`  ${item.method.padEnd(7)} ${item.path.padEnd(40)} ${item.name}`);
                        });
                        break;
                        
                    case 'help':
                    case 'h':
                        console.log('\nCommands:');
                        console.log('  search <query>    - Search for endpoints');
                        console.log('  filter <method>   - Filter by HTTP method');
                        console.log('  category <name>   - Filter by category');
                        console.log('  detail <id>       - Show detailed info for endpoint');
                        console.log('  list              - List all endpoints');
                        console.log('  help              - Show this help');
                        console.log('  exit              - Exit the program');
                        break;
                        
                    case 'exit':
                    case 'quit':
                    case 'q':
                        console.log('Goodbye! 👋');
                        rl.close();
                        process.exit(0);
                        
                    default:
                        if (command) {
                            console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
                        }
                }
                
                prompt();
            });
        };

        prompt();
    }
}

// CLI execution
if (require.main === module) {
    const searcher = new APISearcher();
    
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Interactive mode
        searcher.interactiveSearch();
    } else {
        // Direct search mode
        const query = args.join(' ');
        const results = searcher.search(query, { limit: 5 });
        
        if (results.length === 0) {
            console.log('No results found');
        } else {
            console.log(`Found ${results.length} results for "${query}":`);
            results.forEach(item => searcher.displayResult(item, true));
        }
    }
}

module.exports = APISearcher;
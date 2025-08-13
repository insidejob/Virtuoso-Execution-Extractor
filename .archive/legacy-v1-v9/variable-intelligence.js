/**
 * Variable Intelligence Module
 * 
 * Provides intelligent analysis of variables in Virtuoso test journeys:
 * - Categorizes variables (TEST_DATA, ENVIRONMENT, LOCAL, SYSTEM)
 * - Infers data types from usage context
 * - Provides validation rules and format requirements
 * - Generates helpful descriptions and recommendations
 */

class VariableIntelligence {
    constructor() {
        // Field name patterns for type inference
        this.fieldPatterns = {
            email: {
                patterns: ['email', 'e-mail', 'username', 'user', 'login'],
                dataType: 'string',
                format: 'email',
                validation: 'Valid email address',
                example: 'user@example.com',
                pattern: '^[^@]+@[^@]+\\.[^@]+$'
            },
            password: {
                patterns: ['password', 'pwd', 'pass', 'secret'],
                dataType: 'string',
                format: 'password',
                sensitive: true,
                validation: 'Secure password',
                constraints: ['Minimum 8 characters', 'Hidden in logs']
            },
            number: {
                patterns: ['age', 'count', 'number', 'quantity', 'qty', 'amount'],
                dataType: 'number',
                format: 'integer',
                validation: 'Numeric value'
            },
            decimal: {
                patterns: ['price', 'cost', 'rate', 'salary', 'fee'],
                dataType: 'number',
                format: 'decimal',
                validation: 'Decimal number',
                example: '99.99'
            },
            date: {
                patterns: ['date', 'time', 'timestamp', 'datetime'],
                dataType: 'string',
                format: 'datetime',
                validation: 'Date/time value',
                example: '2025-08-11'
            },
            url: {
                patterns: ['url', 'link', 'href', 'endpoint', 'uri'],
                dataType: 'string',
                format: 'url',
                validation: 'Valid URL',
                example: 'https://example.com'
            },
            phone: {
                patterns: ['phone', 'mobile', 'tel', 'cell'],
                dataType: 'string',
                format: 'phone',
                validation: 'Phone number',
                example: '+1-555-123-4567'
            },
            boolean: {
                patterns: ['enabled', 'disabled', 'active', 'flag', 'is', 'has', 'can', 'should'],
                dataType: 'boolean',
                format: 'boolean',
                validation: 'True/false value',
                example: 'true'
            },
            text: {
                patterns: ['name', 'title', 'description', 'comment', 'note', 'message'],
                dataType: 'string',
                format: 'text',
                validation: 'Text string'
            }
        };

        // Variable name patterns for type inference
        this.variableNamePatterns = {
            number: /\$(.*?)(?:Count|Number|Qty|Amount|Age|Id|Index)$/i,
            boolean: /\$(?:is|has|can|should|will|flag|enabled)(.*)/i,
            date: /\$(.*?)(?:Date|Time|Timestamp)$/i,
            url: /\$(.*?)(?:Url|Link|Endpoint|Uri)$/i,
            email: /\$(.*?)(?:Email|Username|User)$/i,
            password: /\$(.*?)(?:Password|Pwd|Pass|Secret)$/i
        };
    }

    /**
     * Analyze a variable and determine its category, type, and context
     */
    analyzeVariable(varName, varData, journeyData, environmentData) {
        const analysis = {
            name: varName,
            category: this.determineCategory(varName, varData, journeyData, environmentData),
            source: this.determineSource(varName, varData, journeyData, environmentData),
            dataType: this.inferDataType(varName, varData),
            currentValue: this.getCurrentValue(varName, varData, environmentData),
            usage: this.analyzeUsage(varData),
            validation: this.generateValidation(varName, varData),
            description: this.generateDescription(varName, varData),
            recommendations: []
        };

        // Add security warnings
        if (analysis.dataType.format === 'password' && analysis.currentValue !== '********') {
            analysis.recommendations.push({
                type: 'security',
                message: 'Password should be masked in outputs',
                severity: 'high'
            });
        }

        // Add missing value warnings
        if (!analysis.currentValue || analysis.currentValue === 'Not set') {
            analysis.recommendations.push({
                type: 'missing',
                message: `Variable ${varName} has no value defined`,
                severity: 'medium',
                solution: `Define in ${analysis.category === 'ENVIRONMENT' ? 'environment configuration' : 'test data'}`
            });
        }

        return analysis;
    }

    /**
     * Determine variable category
     */
    determineCategory(varName, varData, journeyData, environmentData) {
        // Check if it's from data attributes
        if (journeyData?.dataAttributeValues) {
            const cleanName = varName.replace('$', '');
            if (journeyData.dataAttributeValues[cleanName] !== undefined) {
                return 'TEST_DATA';
            }
        }

        // Check if created via STORE action
        if (varData.usage?.some(u => u.action === 'STORE')) {
            return 'LOCAL';
        }

        // Check if from environment
        if (environmentData && Array.isArray(environmentData)) {
            for (const env of environmentData) {
                if (env.variables) {
                    const cleanName = varName.replace('$', '');
                    if (env.variables[cleanName] !== undefined) {
                        return 'ENVIRONMENT';
                    }
                }
            }
        }

        // Check type hint from varData
        if (varData.type === 'DATA_ATTRIBUTE') {
            return 'TEST_DATA';
        }
        if (varData.type === 'ENVIRONMENT') {
            return 'ENVIRONMENT';
        }

        // Default based on usage patterns
        if (varName.includes('timestamp') || varName.includes('guid')) {
            return 'SYSTEM';
        }

        // If used in login/authentication
        if (varData.usage?.some(u => u.checkpoint?.toLowerCase().includes('login'))) {
            return 'ENVIRONMENT';
        }

        return 'LOCAL';
    }

    /**
     * Determine variable source details
     */
    determineSource(varName, varData, journeyData, environmentData) {
        const category = this.determineCategory(varName, varData, journeyData, environmentData);
        
        switch (category) {
            case 'TEST_DATA':
                return {
                    type: 'dataAttribute',
                    location: 'Journey data attributes',
                    key: varName.replace('$', '')
                };
            
            case 'ENVIRONMENT':
                // Find which environment contains it
                if (environmentData && Array.isArray(environmentData)) {
                    for (const env of environmentData) {
                        if (env.variables) {
                            const cleanName = varName.replace('$', '');
                            if (env.variables[cleanName] !== undefined) {
                                return {
                                    type: 'environment',
                                    location: env.name || 'Default Environment',
                                    secure: varName.toLowerCase().includes('password')
                                };
                            }
                        }
                    }
                }
                return {
                    type: 'environment',
                    location: 'Environment configuration'
                };
            
            case 'LOCAL':
                const storeStep = varData.usage?.find(u => u.action === 'STORE');
                return {
                    type: 'local',
                    location: storeStep ? `${storeStep.checkpoint} - Step ${storeStep.step}` : 'Journey execution',
                    action: 'STORE'
                };
            
            case 'SYSTEM':
                return {
                    type: 'system',
                    location: 'Virtuoso runtime',
                    generated: true
                };
            
            default:
                return {
                    type: 'unknown',
                    location: 'Unknown source'
                };
        }
    }

    /**
     * Infer data type from variable name and usage
     */
    inferDataType(varName, varData) {
        // Check usage in assertions for numeric comparisons
        if (varData.usage?.some(u => 
            u.action === 'ASSERT_VARIABLE' && 
            ['LESS_THAN', 'GREATER_THAN', 'LESS_THAN_OR_EQUALS', 'GREATER_THAN_OR_EQUALS'].includes(u.context)
        )) {
            return {
                primary: 'number',
                format: 'integer',
                validation: 'Numeric value for comparisons'
            };
        }

        // Check field names where variable is used
        for (const usage of (varData.usage || [])) {
            if (usage.field) {
                const fieldLower = usage.field.toLowerCase();
                
                for (const [typeKey, typeConfig] of Object.entries(this.fieldPatterns)) {
                    if (typeConfig.patterns.some(pattern => fieldLower.includes(pattern))) {
                        return {
                            primary: typeConfig.dataType,
                            format: typeConfig.format,
                            ...(typeConfig.sensitive && { sensitive: typeConfig.sensitive }),
                            ...(typeConfig.pattern && { pattern: typeConfig.pattern })
                        };
                    }
                }
            }
        }

        // Check variable name patterns
        const varNameLower = varName.toLowerCase();
        
        // Direct name matching
        for (const [typeKey, typeConfig] of Object.entries(this.fieldPatterns)) {
            if (typeConfig.patterns.some(pattern => varNameLower.includes(pattern))) {
                return {
                    primary: typeConfig.dataType,
                    format: typeConfig.format,
                    ...(typeConfig.sensitive && { sensitive: typeConfig.sensitive })
                };
            }
        }

        // Regex pattern matching
        for (const [type, pattern] of Object.entries(this.variableNamePatterns)) {
            if (pattern.test(varName)) {
                switch (type) {
                    case 'number':
                        return { primary: 'number', format: 'integer' };
                    case 'boolean':
                        return { primary: 'boolean', format: 'boolean' };
                    case 'date':
                        return { primary: 'string', format: 'datetime' };
                    case 'url':
                        return { primary: 'string', format: 'url' };
                    case 'email':
                        return { primary: 'string', format: 'email' };
                    case 'password':
                        return { primary: 'string', format: 'password', sensitive: true };
                }
            }
        }

        // Check actual value to infer type
        if (varData.value && varData.value !== 'Not set') {
            const value = varData.value;
            
            // Check if numeric
            if (/^\d+$/.test(value)) {
                return { primary: 'number', format: 'integer' };
            }
            if (/^\d+\.\d+$/.test(value)) {
                return { primary: 'number', format: 'decimal' };
            }
            
            // Check if boolean
            if (value === 'true' || value === 'false') {
                return { primary: 'boolean', format: 'boolean' };
            }
            
            // Check if URL
            if (/^https?:\/\//.test(value)) {
                return { primary: 'string', format: 'url' };
            }
            
            // Check if email
            if (/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
                return { primary: 'string', format: 'email' };
            }
        }

        // Default to string
        return { primary: 'string', format: 'text' };
    }

    /**
     * Get current value with proper masking for sensitive data
     */
    getCurrentValue(varName, varData, environmentData) {
        const dataType = this.inferDataType(varName, varData);
        
        // Mask sensitive data
        if (dataType.sensitive || dataType.format === 'password') {
            return '********';
        }

        // Try to get from data attributes first
        if (varData.type === 'DATA_ATTRIBUTE' && varData.value) {
            return varData.value;
        }

        // Try environment data
        if (environmentData && Array.isArray(environmentData)) {
            const cleanName = varName.replace('$', '');
            for (const env of environmentData) {
                if (env.variables && env.variables[cleanName] !== undefined) {
                    // Mask passwords
                    if (varName.toLowerCase().includes('password')) {
                        return '********';
                    }
                    return env.variables[cleanName];
                }
            }
        }

        return varData.value || 'Not set';
    }

    /**
     * Analyze variable usage patterns
     */
    analyzeUsage(varData) {
        const usage = {
            count: varData.usage?.length || 0,
            locations: []
        };

        for (const use of (varData.usage || [])) {
            const location = {
                checkpoint: use.checkpoint,
                step: use.step,
                action: use.action,
                ...(use.field && { field: use.field }),
                purpose: this.determinePurpose(use)
            };
            usage.locations.push(location);
        }

        return usage;
    }

    /**
     * Determine the purpose of variable usage
     */
    determinePurpose(usage) {
        // Authentication
        if (usage.checkpoint?.toLowerCase().includes('login') || 
            usage.field?.toLowerCase().includes('password') ||
            usage.field?.toLowerCase().includes('email')) {
            return 'Authentication';
        }

        // Validation
        if (usage.action === 'ASSERT_EXISTS' || usage.action === 'ASSERT_VARIABLE') {
            return 'Validation';
        }

        // Data input
        if (usage.action === 'WRITE') {
            return 'Data input';
        }

        // Data storage
        if (usage.action === 'STORE') {
            return 'Data storage';
        }

        // API interaction
        if (usage.action === 'API_CALL') {
            return 'API parameter';
        }

        // Element interaction
        if (usage.action === 'CLICK' || usage.action === 'MOUSE') {
            return 'Element interaction';
        }

        return 'General usage';
    }

    /**
     * Generate validation rules based on usage
     */
    generateValidation(varName, varData) {
        const dataType = this.inferDataType(varName, varData);
        const validation = {
            required: true,
            format: this.fieldPatterns[dataType.format]?.validation || 'Valid value'
        };

        // Add constraints based on format
        if (dataType.format === 'email') {
            validation.pattern = '^[^@]+@[^@]+\\.[^@]+$';
            validation.example = 'user@example.com';
            validation.constraints = ['Valid email format', 'Case-insensitive'];
        } else if (dataType.format === 'password') {
            validation.constraints = ['Minimum 8 characters', 'Hidden in logs'];
        } else if (dataType.format === 'url') {
            validation.example = 'https://example.com';
            validation.constraints = ['Valid URL format', 'Include protocol'];
        } else if (dataType.primary === 'number') {
            validation.constraints = ['Numeric value'];
            
            // Check for range constraints from assertions
            const lessThan = varData.usage?.find(u => u.context === 'LESS_THAN');
            const greaterThan = varData.usage?.find(u => u.context === 'GREATER_THAN');
            
            if (lessThan || greaterThan) {
                validation.constraints.push('Used in numeric comparisons');
            }
        }

        // Add domain values for test data
        if (varData.type === 'DATA_ATTRIBUTE' && varName.includes('QuestionType')) {
            validation.allowedValues = [
                'Precautions', 'General Work', 'PPE', 
                'Qualifications / Competence', 'Isolation',
                'Work at Height', 'Emergency Procedures', 
                'Confined Spaces'
            ];
        }

        return validation;
    }

    /**
     * Generate helpful description
     */
    generateDescription(varName, varData) {
        const category = varData.type;
        const dataType = this.inferDataType(varName, varData);
        
        // Specific descriptions based on variable name
        if (varName === '$username') {
            return 'Login credential - username/email';
        }
        if (varName === '$password') {
            return 'Login credential - password';
        }
        if (varName.includes('QuestionType')) {
            return `Permit check question category ${varName.match(/\d+/) ? '#' + varName.match(/\d+/)[0] : ''}`;
        }
        if (varName === '$signaturebox') {
            return 'Signature capture element selector';
        }
        
        // Generate based on usage
        const usage = varData.usage?.[0];
        if (usage) {
            if (usage.action === 'WRITE' && usage.field) {
                return `Input for ${usage.field}`;
            }
            if (usage.action === 'ASSERT_EXISTS') {
                return `Text to verify on page`;
            }
            if (usage.action === 'ASSERT_VARIABLE') {
                return `Value for ${usage.context || 'comparison'} assertion`;
            }
            if (usage.action === 'STORE') {
                return `Stored value from test execution`;
            }
        }

        // Default descriptions by type
        if (dataType.format === 'email') {
            return 'Email address';
        }
        if (dataType.format === 'url') {
            return 'URL endpoint';
        }
        if (dataType.primary === 'number') {
            return 'Numeric value';
        }

        return `${category} variable`;
    }

    /**
     * Analyze all variables in a journey
     */
    analyzeAllVariables(variablesData, journeyData, environmentData) {
        const analysis = {
            summary: {
                total: 0,
                byCategory: {
                    TEST_DATA: 0,
                    ENVIRONMENT: 0,
                    LOCAL: 0,
                    SYSTEM: 0
                },
                byDataType: {
                    string: 0,
                    number: 0,
                    boolean: 0,
                    password: 0,
                    email: 0,
                    url: 0,
                    other: 0
                }
            },
            variables: {},
            recommendations: {
                missing: [],
                improvements: [],
                security: []
            }
        };

        // Analyze each variable
        for (const [varName, varData] of Object.entries(variablesData.variables || {})) {
            const varAnalysis = this.analyzeVariable(varName, varData, journeyData, environmentData);
            
            analysis.variables[varName] = varAnalysis;
            analysis.summary.total++;
            
            // Update category counts
            analysis.summary.byCategory[varAnalysis.category]++;
            
            // Update data type counts
            const format = varAnalysis.dataType.format;
            if (format === 'password') {
                analysis.summary.byDataType.password++;
            } else if (format === 'email') {
                analysis.summary.byDataType.email++;
            } else if (format === 'url') {
                analysis.summary.byDataType.url++;
            } else if (varAnalysis.dataType.primary === 'number') {
                analysis.summary.byDataType.number++;
            } else if (varAnalysis.dataType.primary === 'boolean') {
                analysis.summary.byDataType.boolean++;
            } else if (varAnalysis.dataType.primary === 'string') {
                analysis.summary.byDataType.string++;
            } else {
                analysis.summary.byDataType.other++;
            }

            // Collect recommendations
            if (varAnalysis.recommendations.length > 0) {
                for (const rec of varAnalysis.recommendations) {
                    if (rec.type === 'security') {
                        analysis.recommendations.security.push({
                            variable: varName,
                            ...rec
                        });
                    } else if (rec.type === 'missing') {
                        analysis.recommendations.missing.push({
                            variable: varName,
                            ...rec
                        });
                    } else {
                        analysis.recommendations.improvements.push({
                            variable: varName,
                            ...rec
                        });
                    }
                }
            }
        }

        // Add general recommendations
        if (analysis.summary.byCategory.LOCAL === 0 && analysis.summary.byCategory.TEST_DATA > 0) {
            analysis.recommendations.improvements.push({
                type: 'structure',
                message: 'Consider using environment variables for credentials instead of test data',
                severity: 'low'
            });
        }

        return analysis;
    }
}

module.exports = VariableIntelligence;
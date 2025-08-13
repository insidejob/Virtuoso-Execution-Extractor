/**
 * Variable Intelligence v2 - Enhanced Data Type Clarity
 * 
 * Improvements:
 * - Clearer data type specifications
 * - Better examples and patterns
 * - Explicit constraint types
 * - Selector type detection
 * - Username vs email differentiation
 */

class EnhancedVariableIntelligence {
    constructor() {
        // Constraint types for clarity
        this.CONSTRAINT_TYPES = {
            FREE: 'FREE_TEXT',
            ENUM: 'FIXED_LIST',
            PATTERN: 'PATTERN_MATCH',
            RANGE: 'NUMERIC_RANGE',
            SELECTOR: 'ELEMENT_SELECTOR',
            CREDENTIAL: 'SECURE_CREDENTIAL'
        };

        // Enhanced field patterns with better detection
        this.fieldPatterns = {
            username_or_email: {
                patterns: ['username', 'user', 'login', 'email'],
                detection: (value) => {
                    // Check if it's actually an email or username
                    if (value && typeof value === 'string') {
                        if (value.includes('@')) return 'email';
                        if (value.match(/^[a-zA-Z0-9_-]+$/)) return 'username';
                    }
                    return 'username_or_email';
                },
                getSpec: (actualType) => {
                    if (actualType === 'email') {
                        return {
                            primary: 'string',
                            format: 'email',
                            constraint: 'PATTERN_MATCH',
                            pattern: '^[^@]+@[^@]+\\.[^@]+$',
                            examples: ['user@example.com', 'admin@company.org'],
                            invalidExamples: ['admin', 'user@', '@example.com'],
                            description: 'Valid email address'
                        };
                    } else if (actualType === 'username') {
                        return {
                            primary: 'string',
                            format: 'username',
                            constraint: 'PATTERN_MATCH',
                            pattern: '^[a-zA-Z0-9_-]+$',
                            examples: ['admin', 'user123', 'test_user'],
                            invalidExamples: ['user@email', 'user name', 'user!'],
                            description: 'Username (alphanumeric, underscore, hyphen)'
                        };
                    } else {
                        return {
                            primary: 'string',
                            format: 'username_or_email',
                            constraint: 'FLEXIBLE',
                            accepts: ['username', 'email'],
                            examples: ['admin', 'user@example.com'],
                            description: 'Username or email address'
                        };
                    }
                }
            },
            password: {
                patterns: ['password', 'pwd', 'pass', 'secret'],
                dataType: 'string',
                format: 'password',
                constraint: 'CREDENTIAL',
                sensitive: true,
                requirements: {
                    minLength: 8,
                    maxLength: 128,
                    complexity: 'Uppercase, lowercase, number, special character',
                    forbidden: ['password', '123456', 'admin', 'test']
                },
                examples: ['P@ssw0rd123!', 'SecureP@ss2024'],
                maskedAs: '********',
                description: 'Secure password meeting complexity requirements'
            },
            selector: {
                patterns: ['selector', 'element', 'locator', 'box', 'canvas', 'field'],
                detection: (value, varName) => {
                    // Check if it's a selector variable
                    if (varName && (varName.includes('box') || varName.includes('element'))) {
                        return 'selector';
                    }
                    if (value && typeof value === 'string') {
                        if (value.startsWith('#') || value.startsWith('.')) return 'css';
                        if (value.startsWith('//') || value.startsWith('(')) return 'xpath';
                        if (value.match(/^\[.*\]$/)) return 'css_attribute';
                    }
                    return 'selector';
                },
                getSpec: (selectorType) => ({
                    primary: 'string',
                    format: 'element_selector',
                    selectorType: selectorType || 'any',
                    constraint: 'SELECTOR',
                    examples: {
                        css: ['#signature-box', '.signature-canvas', '[data-testid="signature"]'],
                        xpath: ['//canvas[@id="signature"]', '//div[@class="sig-area"]'],
                        id: ['signatureBox123', 'sig_element_456']
                    },
                    invalidExamples: ['signature', '123', 'just text'],
                    description: 'Element selector (CSS, XPath, or ID)',
                    validation: 'Must be valid selector syntax for existing element'
                })
            },
            enum_value: {
                detection: (value, varName, allowedValues) => {
                    return allowedValues && allowedValues.length > 0;
                },
                getSpec: (allowedValues) => ({
                    primary: 'string',
                    format: 'enum',
                    constraint: 'FIXED_LIST',
                    allowedValues: allowedValues,
                    examples: allowedValues.slice(0, 3),
                    invalidExamples: ['Not in list', 'Random value'],
                    description: `Must be one of: ${allowedValues.join(', ')}`,
                    validation: 'MUST match one of the allowed values exactly'
                })
            },
            number: {
                patterns: ['age', 'count', 'number', 'quantity', 'amount', 'price', 'cost'],
                dataType: 'number',
                format: 'integer',
                constraint: 'RANGE',
                examples: [25, 100, 999],
                invalidExamples: ['twenty-five', 'NaN', ''],
                description: 'Numeric value',
                validation: 'Must be a valid number'
            }
        };
    }

    /**
     * Enhanced variable analysis with clearer data types
     */
    analyzeVariable(varName, varData, journeyData, environmentData) {
        const analysis = {
            name: varName,
            category: this.determineCategory(varName, varData, journeyData, environmentData),
            source: this.determineSource(varName, varData, journeyData, environmentData),
            dataType: this.inferEnhancedDataType(varName, varData, journeyData),
            currentValue: this.getCurrentValue(varName, varData, environmentData),
            expectedValue: null, // NEW: Clear specification of expected value
            usage: this.analyzeUsage(varData),
            validation: null, // Will be enhanced
            description: this.generateDescription(varName, varData),
            recommendations: []
        };

        // Add expected value specification
        analysis.expectedValue = this.generateExpectedValueSpec(analysis);
        
        // Enhanced validation with examples
        analysis.validation = this.generateEnhancedValidation(varName, varData, analysis.dataType);

        // Add clarity recommendations
        if (analysis.dataType.format === 'username_or_email') {
            analysis.recommendations.push({
                type: 'clarity',
                message: 'Ambiguous: could be username or email',
                solution: 'Verify if email format is required or username is acceptable'
            });
        }

        if (analysis.dataType.format === 'element_selector' && !analysis.currentValue) {
            analysis.recommendations.push({
                type: 'specification',
                message: 'Element selector not defined',
                solution: 'Provide CSS selector, XPath, or element ID for target element'
            });
        }

        return analysis;
    }

    /**
     * Infer enhanced data type with better specificity
     */
    inferEnhancedDataType(varName, varData, journeyData) {
        const cleanName = varName.replace('$', '');
        
        // Check for enum values (QuestionTypes)
        if (journeyData?.dataAttributeValues && journeyData.dataAttributeValues[cleanName]) {
            const value = journeyData.dataAttributeValues[cleanName];
            
            // Check if it's from a known set
            if (cleanName.includes('QuestionType')) {
                const allowedValues = [
                    'Precautions', 'General Work', 'PPE',
                    'Qualifications / Competence', 'Isolation',
                    'Work at Height', 'Emergency Procedures',
                    'Confined Spaces'
                ];
                return this.fieldPatterns.enum_value.getSpec(allowedValues);
            }
        }

        // Check for selector variables (like signaturebox)
        if (varName.toLowerCase().includes('box') || 
            varName.toLowerCase().includes('element') ||
            varName.toLowerCase().includes('selector') ||
            (varData.source === 'GUESS_SELECTOR')) {
            return this.fieldPatterns.selector.getSpec();
        }

        // Check for username/email
        if (varData.usage?.some(u => u.field?.toLowerCase().includes('email') || 
                                   u.field?.toLowerCase().includes('user'))) {
            const actualValue = varData.value || this.getCurrentValue(varName, varData);
            const actualType = this.fieldPatterns.username_or_email.detection(actualValue);
            return this.fieldPatterns.username_or_email.getSpec(actualType);
        }

        // Check for password
        if (varName.toLowerCase().includes('password') || 
            varData.usage?.some(u => u.field?.toLowerCase().includes('password'))) {
            return {
                primary: 'string',
                format: 'password',
                constraint: this.CONSTRAINT_TYPES.CREDENTIAL,
                sensitive: true,
                ...this.fieldPatterns.password
            };
        }

        // Check for numbers
        if (varData.usage?.some(u => 
            u.action === 'ASSERT_VARIABLE' && 
            ['LESS_THAN', 'GREATER_THAN'].some(op => u.context?.includes(op))
        )) {
            return {
                primary: 'number',
                format: 'integer',
                constraint: this.CONSTRAINT_TYPES.RANGE,
                examples: [1, 25, 100],
                description: 'Numeric value for comparison'
            };
        }

        // Default to free text
        return {
            primary: 'string',
            format: 'text',
            constraint: this.CONSTRAINT_TYPES.FREE,
            examples: ['Sample text', 'Any string value'],
            description: 'Free text value'
        };
    }

    /**
     * Generate clear expected value specification
     */
    generateExpectedValueSpec(analysis) {
        const spec = {
            description: '',
            format: analysis.dataType.format,
            examples: [],
            invalidExamples: [],
            constraints: []
        };

        switch (analysis.dataType.constraint) {
            case this.CONSTRAINT_TYPES.FIXED_LIST:
                spec.description = 'Must be one of the predefined values';
                spec.examples = analysis.dataType.allowedValues?.slice(0, 3) || [];
                spec.invalidExamples = ['Any other value', 'Custom text'];
                spec.constraints = [`Exactly matches one of: ${analysis.dataType.allowedValues?.join(', ')}`];
                break;

            case this.CONSTRAINT_TYPES.SELECTOR:
                spec.description = 'Valid element selector for UI interaction';
                spec.examples = [
                    '#signature-canvas (CSS ID)',
                    '.signature-box (CSS class)',
                    '//canvas[@id="sig"] (XPath)',
                    '[data-testid="signature"] (CSS attribute)'
                ];
                spec.invalidExamples = ['signature', 'click here', '123'];
                spec.constraints = ['Valid CSS/XPath syntax', 'Element must exist on page'];
                break;

            case this.CONSTRAINT_TYPES.CREDENTIAL:
                spec.description = 'Secure password meeting requirements';
                spec.examples = ['P@ssw0rd123!', 'MyS3cur3P@ss'];
                spec.invalidExamples = ['password', '12345678', 'Password'];
                spec.constraints = analysis.dataType.requirements ? 
                    Object.entries(analysis.dataType.requirements).map(([k, v]) => `${k}: ${v}`) : 
                    ['Minimum 8 characters'];
                break;

            case this.CONSTRAINT_TYPES.PATTERN:
                spec.description = analysis.dataType.description || 'Must match pattern';
                spec.examples = analysis.dataType.examples || [];
                spec.invalidExamples = analysis.dataType.invalidExamples || [];
                if (analysis.dataType.pattern) {
                    spec.constraints = [`Pattern: ${analysis.dataType.pattern}`];
                }
                break;

            default:
                spec.description = 'Any text value';
                spec.examples = ['Sample text', 'Test value'];
                spec.constraints = ['No specific format required'];
        }

        return spec;
    }

    /**
     * Generate enhanced validation with clear examples
     */
    generateEnhancedValidation(varName, varData, dataType) {
        return {
            required: true,
            constraintType: dataType.constraint || this.CONSTRAINT_TYPES.FREE,
            format: dataType.format,
            pattern: dataType.pattern,
            allowedValues: dataType.allowedValues,
            requirements: dataType.requirements,
            examples: {
                valid: dataType.examples || [],
                invalid: dataType.invalidExamples || []
            },
            message: this.getValidationMessage(dataType)
        };
    }

    /**
     * Get clear validation message
     */
    getValidationMessage(dataType) {
        switch (dataType.constraint) {
            case this.CONSTRAINT_TYPES.FIXED_LIST:
                return `Must be exactly one of the allowed values`;
            case this.CONSTRAINT_TYPES.SELECTOR:
                return `Must be a valid CSS selector, XPath expression, or element ID`;
            case this.CONSTRAINT_TYPES.CREDENTIAL:
                return `Must meet password complexity requirements`;
            case this.CONSTRAINT_TYPES.PATTERN:
                return `Must match the required pattern`;
            case this.CONSTRAINT_TYPES.RANGE:
                return `Must be within the specified range`;
            default:
                return `Any valid ${dataType.format || 'text'} value`;
        }
    }

    // Keep existing helper methods...
    determineCategory(varName, varData, journeyData, environmentData) {
        // Same as v1
        const cleanName = varName.replace('$', '');
        
        if (journeyData?.dataAttributeValues && 
            journeyData.dataAttributeValues[cleanName] !== undefined) {
            return 'TEST_DATA';
        }
        
        if (varData.source === 'GUESS_SELECTOR') {
            return 'SELECTOR_VARIABLE';
        }
        
        if (varData.usage?.some(u => u.action === 'STORE')) {
            return 'LOCAL';
        }
        
        return 'LOCAL';
    }

    determineSource(varName, varData, journeyData, environmentData) {
        // Same as v1
        const category = this.determineCategory(varName, varData, journeyData, environmentData);
        
        if (category === 'TEST_DATA') {
            return {
                type: 'dataAttribute',
                location: 'Journey data attributes',
                key: varName.replace('$', '')
            };
        }
        
        if (varData.source === 'GUESS_SELECTOR') {
            return {
                type: 'element_selector',
                location: 'GUESS selector in test step',
                purpose: 'Dynamic element targeting'
            };
        }
        
        return {
            type: 'local',
            location: 'Test execution'
        };
    }

    getCurrentValue(varName, varData, environmentData) {
        // Enhanced to not mask non-passwords
        if (varData.type === 'password' || varName.toLowerCase().includes('password')) {
            return '********';
        }
        return varData.value || 'Not set';
    }

    analyzeUsage(varData) {
        // Same as v1
        return {
            count: varData.usage?.length || 0,
            locations: varData.usage || []
        };
    }

    generateDescription(varName, varData) {
        // Enhanced descriptions
        if (varName.toLowerCase().includes('signaturebox')) {
            return 'Element selector for signature capture area';
        }
        if (varName.toLowerCase().includes('username')) {
            const value = varData.value;
            if (value && !value.includes('@')) {
                return 'Login username (not email format)';
            }
            return 'Login credential - username or email';
        }
        if (varName.includes('QuestionType')) {
            return `Permit check question category from fixed list`;
        }
        return 'Variable used in test';
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
                    SELECTOR_VARIABLE: 0,
                    DATA_ATTRIBUTE: 0,
                    SYSTEM: 0
                },
                byDataType: {
                    string: 0,
                    number: 0,
                    boolean: 0,
                    password: 0,
                    email: 0,
                    username: 0,
                    url: 0,
                    element_selector: 0,
                    xpath_selector: 0,
                    enum: 0,
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
            if (analysis.summary.byCategory[varAnalysis.category] !== undefined) {
                analysis.summary.byCategory[varAnalysis.category]++;
            }
            
            // Update data type counts
            const format = varAnalysis.dataType.format;
            if (analysis.summary.byDataType[format]) {
                analysis.summary.byDataType[format]++;
            } else if (varAnalysis.dataType.primary === 'number') {
                analysis.summary.byDataType.number++;
            } else if (varAnalysis.dataType.primary === 'boolean') {
                analysis.summary.byDataType.boolean++;
            } else if (varAnalysis.dataType.primary === 'string') {
                analysis.summary.byDataType.string++;
            } else {
                analysis.summary.byDataType.other++;
            }
            
            // Add recommendations
            if (format === 'password' && (!varData.value || varData.value === 'Not set')) {
                analysis.recommendations.security.push(`${varName}: Password not set`);
            }
            if (varAnalysis.validation && varAnalysis.validation.warnings) {
                analysis.recommendations.improvements.push(...varAnalysis.validation.warnings);
            }
        }

        return analysis;
    }
}

module.exports = EnhancedVariableIntelligence;
/**
 * Validation and Error Tracking System - Core V10
 * 
 * Tracks extraction accuracy and generates detailed reports
 */

const fs = require('fs');
const path = require('path');

class ValidationTracker {
    constructor(options = {}) {
        this.strict = options.strict || false;
        this.autoCreateReports = options.autoCreateReports !== false;
        
        // Tracking metrics
        this.metrics = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            healedSteps: 0,
            unknownActions: new Set(),
            validatedActions: new Set(),
            errors: [],
            warnings: [],
            fixes: []
        };
        
        // Validation rules
        this.validationRules = {
            nlp: {
                minLength: 1,
                maxLength: 500,
                requiredPatterns: [],
                forbiddenPatterns: ['[ERROR', '[Unknown']
            },
            variables: {
                requiredTypes: ['value', 'type', 'source'],
                validTypes: ['LOCAL', 'DATA_ATTRIBUTE', 'ENVIRONMENT', 'SELECTOR_VARIABLE'],
                namingPattern: /^\$?[a-zA-Z_][a-zA-Z0-9_]*$/
            }
        };
        
        // Accuracy thresholds
        this.thresholds = {
            excellent: 100,
            good: 95,
            acceptable: 90,
            poor: 80,
            critical: 0
        };
    }
    
    /**
     * Track step processing
     */
    trackStep(step, result, context = {}) {
        this.metrics.totalSteps++;
        
        if (result.success) {
            this.metrics.successfulSteps++;
            if (result.healed) {
                this.metrics.healedSteps++;
            }
        } else {
            this.metrics.failedSteps++;
            this.trackError(step, result.error, context);
        }
        
        // Track action types
        if (step.action) {
            if (result.success) {
                this.metrics.validatedActions.add(step.action);
            } else {
                this.metrics.unknownActions.add(step.action);
            }
        }
    }
    
    /**
     * Track error
     */
    trackError(step, error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            step: {
                action: step.action,
                value: step.value,
                variable: step.variable
            },
            error: error.message || error,
            context: context,
            severity: this.calculateSeverity(error)
        };
        
        this.metrics.errors.push(errorEntry);
        
        // Log critical errors
        if (errorEntry.severity === 'CRITICAL') {
            console.error(`❌ Critical error in ${step.action}:`, error);
        }
    }
    
    /**
     * Track warning
     */
    trackWarning(message, context = {}) {
        this.metrics.warnings.push({
            timestamp: new Date().toISOString(),
            message: message,
            context: context
        });
    }
    
    /**
     * Track applied fix
     */
    trackFix(fixType, details) {
        this.metrics.fixes.push({
            timestamp: new Date().toISOString(),
            type: fixType,
            details: details,
            automated: true
        });
    }
    
    /**
     * Validate NLP output
     */
    validateNLP(nlpText) {
        const validation = {
            valid: true,
            issues: []
        };
        
        const lines = nlpText.split('\n');
        
        lines.forEach((line, index) => {
            // Check line length
            if (line.length > this.validationRules.nlp.maxLength) {
                validation.issues.push({
                    line: index + 1,
                    type: 'LINE_TOO_LONG',
                    message: `Line exceeds ${this.validationRules.nlp.maxLength} characters`
                });
            }
            
            // Check for error patterns
            this.validationRules.nlp.forbiddenPatterns.forEach(pattern => {
                if (line.includes(pattern)) {
                    validation.valid = false;
                    validation.issues.push({
                        line: index + 1,
                        type: 'ERROR_PATTERN',
                        message: `Contains error pattern: ${pattern}`,
                        severity: 'HIGH'
                    });
                }
            });
            
            // Check for checkpoint format
            if (line.startsWith('Checkpoint')) {
                const checkpointPattern = /^Checkpoint \d+: .+$/;
                if (!checkpointPattern.test(line)) {
                    validation.issues.push({
                        line: index + 1,
                        type: 'INVALID_CHECKPOINT',
                        message: 'Invalid checkpoint format'
                    });
                }
            }
        });
        
        return validation;
    }
    
    /**
     * Validate variables
     */
    validateVariables(variables) {
        const validation = {
            valid: true,
            issues: []
        };
        
        Object.entries(variables.variables || variables).forEach(([varName, varData]) => {
            // Check naming convention
            if (!this.validationRules.variables.namingPattern.test(varName)) {
                validation.issues.push({
                    variable: varName,
                    type: 'INVALID_NAME',
                    message: 'Variable name does not match pattern'
                });
            }
            
            // Check required fields
            this.validationRules.variables.requiredTypes.forEach(field => {
                if (!varData[field]) {
                    validation.issues.push({
                        variable: varName,
                        type: 'MISSING_FIELD',
                        field: field,
                        message: `Missing required field: ${field}`
                    });
                }
            });
            
            // Check valid type
            if (varData.type && !this.validationRules.variables.validTypes.includes(varData.type)) {
                validation.issues.push({
                    variable: varName,
                    type: 'INVALID_TYPE',
                    message: `Invalid variable type: ${varData.type}`
                });
            }
            
            // Check for empty values that shouldn't be empty
            if (varData.type !== 'PLACEHOLDER' && !varData.value) {
                validation.issues.push({
                    variable: varName,
                    type: 'EMPTY_VALUE',
                    message: 'Variable has no value',
                    severity: 'WARNING'
                });
            }
        });
        
        validation.valid = validation.issues.filter(i => i.severity !== 'WARNING').length === 0;
        
        return validation;
    }
    
    /**
     * Calculate overall accuracy
     */
    calculateAccuracy() {
        if (this.metrics.totalSteps === 0) return 100;
        
        const successRate = (this.metrics.successfulSteps / this.metrics.totalSteps) * 100;
        const healingPenalty = (this.metrics.healedSteps / this.metrics.totalSteps) * 5; // 5% penalty per healed step
        
        return Math.max(0, Math.round(successRate - healingPenalty));
    }
    
    /**
     * Get accuracy level
     */
    getAccuracyLevel() {
        const accuracy = this.calculateAccuracy();
        
        if (accuracy >= this.thresholds.excellent) return 'EXCELLENT';
        if (accuracy >= this.thresholds.good) return 'GOOD';
        if (accuracy >= this.thresholds.acceptable) return 'ACCEPTABLE';
        if (accuracy >= this.thresholds.poor) return 'POOR';
        return 'CRITICAL';
    }
    
    /**
     * Calculate error severity
     */
    calculateSeverity(error) {
        const errorStr = error.toString().toLowerCase();
        
        if (errorStr.includes('critical') || errorStr.includes('fatal')) {
            return 'CRITICAL';
        }
        if (errorStr.includes('error') || errorStr.includes('failed')) {
            return 'HIGH';
        }
        if (errorStr.includes('warning') || errorStr.includes('unknown')) {
            return 'MEDIUM';
        }
        return 'LOW';
    }
    
    /**
     * Generate validation report
     */
    generateReport() {
        const accuracy = this.calculateAccuracy();
        const level = this.getAccuracyLevel();
        
        return {
            timestamp: new Date().toISOString(),
            version: 'v10.0.0',
            summary: {
                accuracy: accuracy,
                level: level,
                totalSteps: this.metrics.totalSteps,
                successfulSteps: this.metrics.successfulSteps,
                failedSteps: this.metrics.failedSteps,
                healedSteps: this.metrics.healedSteps
            },
            actions: {
                validated: Array.from(this.metrics.validatedActions).sort(),
                unknown: Array.from(this.metrics.unknownActions).sort(),
                coverage: (this.metrics.validatedActions.size / 
                    (this.metrics.validatedActions.size + this.metrics.unknownActions.size) * 100).toFixed(1) + '%'
            },
            issues: {
                errors: this.metrics.errors,
                warnings: this.metrics.warnings,
                total: this.metrics.errors.length + this.metrics.warnings.length
            },
            fixes: {
                applied: this.metrics.fixes,
                total: this.metrics.fixes.length,
                automated: this.metrics.fixes.filter(f => f.automated).length
            },
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const accuracy = this.calculateAccuracy();
        
        // Accuracy-based recommendations
        if (accuracy < this.thresholds.acceptable) {
            recommendations.push({
                priority: 'HIGH',
                type: 'IMPROVE_ACCURACY',
                message: `Accuracy is ${accuracy}%, below acceptable threshold of ${this.thresholds.acceptable}%`,
                action: 'Review failed steps and add handlers for unknown actions'
            });
        }
        
        // Unknown actions recommendations
        if (this.metrics.unknownActions.size > 0) {
            recommendations.push({
                priority: 'HIGH',
                type: 'ADD_HANDLERS',
                message: `${this.metrics.unknownActions.size} unknown actions detected`,
                actions: Array.from(this.metrics.unknownActions),
                action: 'Add handlers to core/nlp-converter.js'
            });
        }
        
        // Healing recommendations
        if (this.metrics.healedSteps > this.metrics.totalSteps * 0.1) {
            recommendations.push({
                priority: 'MEDIUM',
                type: 'REDUCE_HEALING',
                message: `${((this.metrics.healedSteps / this.metrics.totalSteps) * 100).toFixed(1)}% of steps required healing`,
                action: 'Review healed steps and add permanent fixes'
            });
        }
        
        // Error recommendations
        const criticalErrors = this.metrics.errors.filter(e => e.severity === 'CRITICAL');
        if (criticalErrors.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                type: 'FIX_ERRORS',
                message: `${criticalErrors.length} critical errors detected`,
                errors: criticalErrors,
                action: 'Fix critical errors immediately'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Save validation report
     */
    saveReport(folderPath, createAccuracyFolder = true) {
        const report = this.generateReport();
        
        // Main validation report
        const mainReportPath = path.join(folderPath, 'validation_report.json');
        fs.writeFileSync(mainReportPath, JSON.stringify(report, null, 2));
        
        // Create accuracy folder if issues
        if (createAccuracyFolder && report.summary.accuracy < this.thresholds.excellent) {
            const accuracyPath = path.join(folderPath, '.accuracy');
            if (!fs.existsSync(accuracyPath)) {
                fs.mkdirSync(accuracyPath);
            }
            
            // Detailed error report
            if (report.issues.errors.length > 0) {
                const errorReportPath = path.join(accuracyPath, 'ERROR_REPORT.json');
                fs.writeFileSync(errorReportPath, JSON.stringify({
                    timestamp: report.timestamp,
                    errors: report.issues.errors,
                    severity_breakdown: this.getSeverityBreakdown()
                }, null, 2));
            }
            
            // Fix instructions
            if (report.recommendations.length > 0) {
                const fixPath = path.join(accuracyPath, 'FIX_INSTRUCTIONS.md');
                const fixContent = this.generateFixInstructions(report.recommendations);
                fs.writeFileSync(fixPath, fixContent);
            }
        }
        
        return mainReportPath;
    }
    
    /**
     * Get severity breakdown
     */
    getSeverityBreakdown() {
        const breakdown = {
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0
        };
        
        this.metrics.errors.forEach(error => {
            breakdown[error.severity]++;
        });
        
        return breakdown;
    }
    
    /**
     * Generate fix instructions markdown
     */
    generateFixInstructions(recommendations) {
        let content = '# Fix Instructions\n\n';
        content += `Generated: ${new Date().toISOString()}\n\n`;
        
        // Group by priority
        const byPriority = {
            CRITICAL: [],
            HIGH: [],
            MEDIUM: [],
            LOW: []
        };
        
        recommendations.forEach(rec => {
            byPriority[rec.priority].push(rec);
        });
        
        // Write sections
        Object.entries(byPriority).forEach(([priority, recs]) => {
            if (recs.length > 0) {
                content += `## ${priority} Priority\n\n`;
                
                recs.forEach((rec, index) => {
                    content += `### ${index + 1}. ${rec.type}\n\n`;
                    content += `**Issue:** ${rec.message}\n\n`;
                    content += `**Action Required:** ${rec.action}\n\n`;
                    
                    if (rec.actions) {
                        content += '**Unknown Actions:**\n';
                        rec.actions.forEach(action => {
                            content += `- ${action}\n`;
                        });
                        content += '\n';
                    }
                    
                    if (rec.errors) {
                        content += '**Errors:**\n';
                        rec.errors.forEach(error => {
                            content += `- ${error.step.action}: ${error.error}\n`;
                        });
                        content += '\n';
                    }
                });
            }
        });
        
        return content;
    }
    
    /**
     * Print summary to console
     */
    printSummary() {
        const accuracy = this.calculateAccuracy();
        const level = this.getAccuracyLevel();
        
        console.log('\n📊 Validation Summary:');
        console.log(`   Accuracy: ${accuracy}% (${level})`);
        console.log(`   Total Steps: ${this.metrics.totalSteps}`);
        console.log(`   Successful: ${this.metrics.successfulSteps}`);
        console.log(`   Failed: ${this.metrics.failedSteps}`);
        
        if (this.metrics.healedSteps > 0) {
            console.log(`   Self-Healed: ${this.metrics.healedSteps}`);
        }
        
        if (this.metrics.unknownActions.size > 0) {
            console.log(`   Unknown Actions: ${Array.from(this.metrics.unknownActions).join(', ')}`);
        }
        
        if (this.metrics.errors.length > 0) {
            const breakdown = this.getSeverityBreakdown();
            console.log(`   Errors: ${this.metrics.errors.length} (Critical: ${breakdown.CRITICAL}, High: ${breakdown.HIGH})`);
        }
    }
    
    /**
     * Reset tracker
     */
    reset() {
        this.metrics = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            healedSteps: 0,
            unknownActions: new Set(),
            validatedActions: new Set(),
            errors: [],
            warnings: [],
            fixes: []
        };
    }
}

module.exports = ValidationTracker;
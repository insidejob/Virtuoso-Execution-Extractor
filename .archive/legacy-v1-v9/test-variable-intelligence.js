#!/usr/bin/env node

/**
 * Test Variable Intelligence
 * 
 * Demonstrates the enhanced variable analysis on existing journey extractions
 */

const fs = require('fs');
const path = require('path');
const VariableIntelligence = require('./variable-intelligence');

function testVariableIntelligence(extractionPath) {
    console.log('🔍 Testing Variable Intelligence System\n');
    console.log('=' .repeat(70));
    console.log(`Path: ${extractionPath}\n`);
    
    try {
        // Load the data files
        const variablesPath = path.join(extractionPath, 'variables-used.json');
        const journeyPath = path.join(extractionPath, 'raw-data', 'journey.json');
        const environmentPath = path.join(extractionPath, 'raw-data', 'environments.json');
        
        if (!fs.existsSync(variablesPath)) {
            console.error('❌ Variables file not found:', variablesPath);
            return;
        }
        
        const variablesData = JSON.parse(fs.readFileSync(variablesPath, 'utf8'));
        const journeyData = fs.existsSync(journeyPath) 
            ? JSON.parse(fs.readFileSync(journeyPath, 'utf8'))
            : null;
        const environmentData = fs.existsSync(environmentPath)
            ? JSON.parse(fs.readFileSync(environmentPath, 'utf8'))
            : null;
        
        // Create intelligence analyzer
        const analyzer = new VariableIntelligence();
        
        // Analyze all variables
        const analysis = analyzer.analyzeAllVariables(variablesData, journeyData, environmentData);
        
        // Display results
        console.log('📊 VARIABLE ANALYSIS RESULTS\n');
        console.log('=' .repeat(70));
        
        // Summary
        console.log('\n📈 Summary:');
        console.log(`Total Variables: ${analysis.summary.total}`);
        console.log('\nBy Category:');
        for (const [category, count] of Object.entries(analysis.summary.byCategory)) {
            if (count > 0) {
                console.log(`  ${category}: ${count}`);
            }
        }
        console.log('\nBy Data Type:');
        for (const [type, count] of Object.entries(analysis.summary.byDataType)) {
            if (count > 0) {
                console.log(`  ${type}: ${count}`);
            }
        }
        
        // Detailed variable analysis
        console.log('\n' + '=' .repeat(70));
        console.log('📝 DETAILED VARIABLE ANALYSIS\n');
        
        for (const [varName, varAnalysis] of Object.entries(analysis.variables)) {
            console.log(`\n${varName}`);
            console.log('-'.repeat(varName.length));
            console.log(`Category: ${varAnalysis.category}`);
            console.log(`Data Type: ${varAnalysis.dataType.primary} (${varAnalysis.dataType.format})`);
            console.log(`Current Value: ${varAnalysis.currentValue}`);
            console.log(`Description: ${varAnalysis.description}`);
            
            if (varAnalysis.source) {
                console.log(`Source: ${varAnalysis.source.type} - ${varAnalysis.source.location}`);
            }
            
            if (varAnalysis.usage.count > 0) {
                console.log(`Usage: ${varAnalysis.usage.count} location(s)`);
                for (const loc of varAnalysis.usage.locations) {
                    console.log(`  - ${loc.checkpoint} Step ${loc.step}: ${loc.action} (${loc.purpose})`);
                    if (loc.field) {
                        console.log(`    Field: "${loc.field}"`);
                    }
                }
            }
            
            if (varAnalysis.validation) {
                console.log('Validation:');
                console.log(`  Format: ${varAnalysis.validation.format}`);
                if (varAnalysis.validation.example) {
                    console.log(`  Example: ${varAnalysis.validation.example}`);
                }
                if (varAnalysis.validation.constraints) {
                    console.log(`  Constraints: ${varAnalysis.validation.constraints.join(', ')}`);
                }
                if (varAnalysis.validation.allowedValues) {
                    console.log(`  Allowed Values: ${varAnalysis.validation.allowedValues.slice(0, 3).join(', ')}...`);
                }
            }
            
            if (varAnalysis.recommendations && varAnalysis.recommendations.length > 0) {
                console.log('⚠️  Recommendations:');
                for (const rec of varAnalysis.recommendations) {
                    console.log(`  - [${rec.severity}] ${rec.message}`);
                    if (rec.solution) {
                        console.log(`    Solution: ${rec.solution}`);
                    }
                }
            }
        }
        
        // Overall recommendations
        if (Object.values(analysis.recommendations).some(r => r.length > 0)) {
            console.log('\n' + '=' .repeat(70));
            console.log('🎯 OVERALL RECOMMENDATIONS\n');
            
            if (analysis.recommendations.security.length > 0) {
                console.log('🔒 Security Issues:');
                for (const rec of analysis.recommendations.security) {
                    console.log(`  - ${rec.variable}: ${rec.message}`);
                }
            }
            
            if (analysis.recommendations.missing.length > 0) {
                console.log('\n⚠️  Missing Values:');
                for (const rec of analysis.recommendations.missing) {
                    console.log(`  - ${rec.variable}: ${rec.message}`);
                    if (rec.solution) {
                        console.log(`    → ${rec.solution}`);
                    }
                }
            }
            
            if (analysis.recommendations.improvements.length > 0) {
                console.log('\n💡 Improvements:');
                for (const rec of analysis.recommendations.improvements) {
                    console.log(`  - ${rec.message || rec.variable}`);
                }
            }
        }
        
        // Save enhanced output
        const outputPath = path.join(extractionPath, 'variables-enhanced.json');
        fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
        console.log('\n' + '=' .repeat(70));
        console.log(`✅ Enhanced analysis saved to: ${outputPath}`);
        
        // Create markdown report
        const markdownReport = generateMarkdownReport(analysis, extractionPath);
        const reportPath = path.join(extractionPath, 'variables-report.md');
        fs.writeFileSync(reportPath, markdownReport);
        console.log(`📄 Markdown report saved to: ${reportPath}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

function generateMarkdownReport(analysis, extractionPath) {
    const journeyName = path.basename(extractionPath);
    const projectName = path.basename(path.dirname(path.dirname(extractionPath)));
    
    let report = `# Variable Analysis Report\n\n`;
    report += `**Project:** ${projectName}\n`;
    report += `**Journey:** ${journeyName}\n`;
    report += `**Date:** ${new Date().toISOString()}\n\n`;
    
    // Summary
    report += `## Summary\n\n`;
    report += `- **Total Variables:** ${analysis.summary.total}\n`;
    report += `- **Categories:** `;
    report += Object.entries(analysis.summary.byCategory)
        .filter(([_, count]) => count > 0)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(', ');
    report += `\n`;
    report += `- **Data Types:** `;
    report += Object.entries(analysis.summary.byDataType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `${type} (${count})`)
        .join(', ');
    report += `\n\n`;
    
    // Variable Details Table
    report += `## Variable Details\n\n`;
    report += `| Variable | Category | Type | Format | Value | Description |\n`;
    report += `|----------|----------|------|--------|-------|-------------|\n`;
    
    for (const [varName, v] of Object.entries(analysis.variables)) {
        const value = v.currentValue === '********' ? '\\*\\*\\*\\*\\*\\*\\*\\*' : 
                      v.currentValue || 'Not set';
        report += `| ${varName} | ${v.category} | ${v.dataType.primary} | ${v.dataType.format} | ${value} | ${v.description} |\n`;
    }
    
    // Usage Details
    report += `\n## Usage Analysis\n\n`;
    for (const [varName, v] of Object.entries(analysis.variables)) {
        if (v.usage.count > 0) {
            report += `### ${varName}\n\n`;
            report += `**Used ${v.usage.count} time(s):**\n`;
            for (const loc of v.usage.locations) {
                report += `- ${loc.checkpoint} (Step ${loc.step}): ${loc.action}`;
                if (loc.field) {
                    report += ` in field "${loc.field}"`;
                }
                report += ` - ${loc.purpose}\n`;
            }
            report += `\n`;
        }
    }
    
    // Validation Rules
    report += `## Validation Rules\n\n`;
    for (const [varName, v] of Object.entries(analysis.variables)) {
        if (v.validation && (v.validation.constraints || v.validation.allowedValues)) {
            report += `### ${varName}\n\n`;
            report += `- **Format:** ${v.validation.format}\n`;
            if (v.validation.example) {
                report += `- **Example:** \`${v.validation.example}\`\n`;
            }
            if (v.validation.constraints) {
                report += `- **Constraints:** ${v.validation.constraints.join(', ')}\n`;
            }
            if (v.validation.allowedValues) {
                report += `- **Allowed Values:** ${v.validation.allowedValues.join(', ')}\n`;
            }
            report += `\n`;
        }
    }
    
    // Recommendations
    if (Object.values(analysis.recommendations).some(r => r.length > 0)) {
        report += `## Recommendations\n\n`;
        
        if (analysis.recommendations.security.length > 0) {
            report += `### 🔒 Security\n\n`;
            for (const rec of analysis.recommendations.security) {
                report += `- **${rec.variable}:** ${rec.message}\n`;
            }
            report += `\n`;
        }
        
        if (analysis.recommendations.missing.length > 0) {
            report += `### ⚠️ Missing Values\n\n`;
            for (const rec of analysis.recommendations.missing) {
                report += `- **${rec.variable}:** ${rec.message}\n`;
                if (rec.solution) {
                    report += `  - Solution: ${rec.solution}\n`;
                }
            }
            report += `\n`;
        }
        
        if (analysis.recommendations.improvements.length > 0) {
            report += `### 💡 Improvements\n\n`;
            for (const rec of analysis.recommendations.improvements) {
                report += `- ${rec.message || rec.variable}\n`;
            }
        }
    }
    
    return report;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node test-variable-intelligence.js <extraction-path>');
    console.log('\nExamples:');
    console.log('  node test-variable-intelligence.js extractions/ipermit-testing/2-permit-check-stage/2025-08-11T16-47-16-execution-86332/check-a-permit');
    console.log('  node test-variable-intelligence.js extractions/ipermit-testing/demo/2025-08-11T17-56-40-execution-173641/first-journey');
    
    // Try to find recent extractions
    console.log('\nRecent extractions found:');
    const extractionsDir = 'extractions';
    if (fs.existsSync(extractionsDir)) {
        const projects = fs.readdirSync(extractionsDir);
        for (const project of projects.slice(0, 3)) {
            const projectPath = path.join(extractionsDir, project);
            if (fs.statSync(projectPath).isDirectory()) {
                const goals = fs.readdirSync(projectPath);
                for (const goal of goals.slice(0, 2)) {
                    const goalPath = path.join(projectPath, goal);
                    if (fs.statSync(goalPath).isDirectory()) {
                        const executions = fs.readdirSync(goalPath);
                        if (executions.length > 0) {
                            const execution = executions[executions.length - 1]; // Latest
                            const execPath = path.join(goalPath, execution);
                            const journeys = fs.readdirSync(execPath);
                            if (journeys.length > 0) {
                                const journey = journeys[0];
                                console.log(`  - ${path.join(projectPath, goal, execution, journey)}`);
                            }
                        }
                    }
                }
            }
        }
    }
} else {
    testVariableIntelligence(args[0]);
}
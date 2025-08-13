/**
 * Folder Structure Module - Core V10
 * 
 * Handles folder naming conventions and output structure
 * Key Convention: Use underscores, not hyphens or spaces
 */

const fs = require('fs');
const path = require('path');

class FolderStructure {
    constructor(config = {}) {
        this.baseDir = config.baseDir || 'extractions';
        this.useTimestamps = config.useTimestamps !== false;
        this.createAccuracyFolder = config.createAccuracyFolder || false;
    }
    
    /**
     * Create folder structure for extraction - V12: Refined structure with journey-executionId naming
     * Structure: Organization → Project → Goal → Date → Journey-ExecutionId
     */
    createExtractionFolder(organizationData, projectData, goalData, executionData, journeyData) {
        // Use clean, human-readable names (no IDs in folder names)
        const organizationName = this.cleanName(organizationData?.name || 'Unknown Organization');
        const projectName = this.cleanName(projectData?.name || 'Unknown Project');
        const goalName = this.cleanName(goalData?.name || 'Unknown Goal');
        
        // Date folder (YYYY-MM-DD format)
        const dateFolder = this.useTimestamps ? 
            new Date().toISOString().split('T')[0] : ''; // 2025-08-12
        
        // Journey folder with execution ID: Journey-ExecutionId
        const journeyBaseName = this.cleanName(
            journeyData?.title || journeyData?.name || 'Unknown Journey'
        );
        const executionId = executionData?.id || 'unknown';
        const journeyWithExecution = `${journeyBaseName}-${executionId}`;
        
        // Build path progressively, reusing existing parent folders
        const organizationPath = path.join(this.baseDir, organizationName);
        const projectPath = path.join(organizationPath, this.ensureUniqueNameIfNew(organizationPath, projectName));
        const goalPath = path.join(projectPath, this.ensureUniqueNameIfNew(projectPath, goalName));
        const datePath = dateFolder ? path.join(goalPath, dateFolder) : goalPath;
        const journeyPath = path.join(datePath, this.ensureUniqueName(datePath, journeyWithExecution));
        
        // Create directory structure
        this.ensureDirectoryExists(journeyPath);
        
        // Create subdirectories
        const rawDataPath = path.join(journeyPath, 'raw_data');
        this.ensureDirectoryExists(rawDataPath);
        
        if (this.createAccuracyFolder) {
            const accuracyPath = path.join(journeyPath, '.accuracy');
            this.ensureDirectoryExists(accuracyPath);
        }
        
        // Create metadata.json with all IDs and references
        const metadata = {
            extraction_info: {
                timestamp: new Date().toISOString(),
                version: 'v12.0.0',
                structure_type: 'refined_hierarchy'
            },
            ids: {
                organization: organizationData?.id,
                project: projectData?.id,
                goal: goalData?.id,
                execution: executionData?.id,
                journey: journeyData?.id
            },
            names: {
                organization: organizationData?.name,
                project: projectData?.name,
                goal: goalData?.name,
                journey: {
                    title: journeyData?.title,
                    name: journeyData?.name
                }
            },
            paths: {
                organization: organizationName,
                project: path.basename(projectPath),
                goal: path.basename(goalPath),
                date: dateFolder,
                journey_with_execution: path.basename(journeyPath)
            },
            structure_improvements: {
                removed_execution_folder_level: true,
                execution_id_in_journey_name: true,
                parent_folder_reuse: true
            }
        };
        
        fs.writeFileSync(path.join(journeyPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
        
        return {
            basePath: journeyPath,
            rawDataPath: rawDataPath,
            accuracyPath: this.createAccuracyFolder ? path.join(journeyPath, '.accuracy') : null,
            organizationFolder: organizationName,
            projectFolder: path.basename(projectPath),
            goalFolder: path.basename(goalPath),
            dateFolder: dateFolder,
            journeyFolder: path.basename(journeyPath),
            metadata: metadata
        };
    }
    
    /**
     * Clean name for folder - human-readable, preserve spaces and case
     * V11: Clean names without IDs, suitable for human navigation
     */
    cleanName(name) {
        if (!name) return 'Unknown';
        
        // Clean the name while preserving readability
        return name
            .trim()                          // Remove leading/trailing whitespace
            .replace(/[<>:"/\\|?*]/g, '_')    // Replace filesystem-unsafe chars
            .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
            .replace(/_{2,}/g, '_')          // Replace multiple underscores with single
            .trim() || 'Unknown';
    }
    
    /**
     * Ensure folder name is unique by adding counter suffix if needed
     * E.g., "Demo" -> "Demo (2)" if "Demo" exists
     */
    ensureUniqueName(parentPath, name) {
        if (!fs.existsSync(parentPath)) {
            return name;
        }
        
        const originalName = name;
        let counter = 1;
        let testPath = path.join(parentPath, name);
        
        // Check if folder exists, if so add counter
        while (fs.existsSync(testPath)) {
            counter++;
            name = `${originalName} (${counter})`;
            testPath = path.join(parentPath, name);
        }
        
        return name;
    }
    
    /**
     * Smart folder reuse: Only add counter if this is a new extraction creating a duplicate name
     * For parent folders (organization, project, goal, date), reuse existing folders
     * Only journey folders need uniqueness since they include execution ID
     */
    ensureUniqueNameIfNew(parentPath, name) {
        if (!fs.existsSync(parentPath)) {
            return name;
        }
        
        const targetPath = path.join(parentPath, name);
        
        // If folder already exists, reuse it (don't add counter for parent folders)
        if (fs.existsSync(targetPath)) {
            return name;
        }
        
        // If folder doesn't exist, use the name as-is (no counter needed)
        return name;
    }
    
    /**
     * Sanitize name for folder - use underscores instead of spaces/hyphens
     * DEPRECATED: Use cleanName() for V11+ structure
     */
    sanitizeName(name, id) {
        if (!name) return id ? `unknown_${id}` : 'unknown';
        
        // V10 Convention: Replace spaces, hyphens, and special chars with underscores
        let sanitized = name
            .toLowerCase()
            .replace(/[\s-]+/g, '_')        // Replace spaces and hyphens with underscores
            .replace(/[^a-z0-9_]/g, '_')    // Replace other special chars with underscores
            .replace(/_+/g, '_')             // Remove duplicate underscores
            .replace(/^_|_$/g, '');          // Remove leading/trailing underscores
        
        // Add ID if provided
        if (id) {
            sanitized = `${sanitized}_${id}`;
        }
        
        return sanitized || 'unnamed';
    }
    
    /**
     * Ensure directory exists, create if not
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    /**
     * Get output file paths for an extraction
     */
    getOutputPaths(basePath, options = {}) {
        const paths = {
            // Always created
            extractionSummary: path.join(basePath, 'extraction_summary.json'),
            metadata: path.join(basePath, 'metadata.json'),
            rawData: {
                journey: path.join(basePath, 'raw_data', 'journey.json'),
                execution: path.join(basePath, 'raw_data', 'execution.json'),
                project: path.join(basePath, 'raw_data', 'project.json'),
                goal: path.join(basePath, 'raw_data', 'goal.json'),
                organization: path.join(basePath, 'raw_data', 'organization.json'),
                environments: path.join(basePath, 'raw_data', 'environments.json')
            }
        };
        
        // Optional files based on flags
        if (options.nlp) {
            paths.nlp = path.join(basePath, 'execution.nlp.txt');
        }
        
        if (options.vars) {
            paths.variables = path.join(basePath, 'variables.json');
        }
        
        if (options.validate || options.debug) {
            paths.validationReport = path.join(basePath, 'validation_report.json');
        }
        
        // Accuracy folder files (only if issues found)
        if (this.createAccuracyFolder) {
            paths.accuracy = {
                errorReport: path.join(basePath, '.accuracy', 'ERROR_REPORT.json'),
                fixInstructions: path.join(basePath, '.accuracy', 'FIX_INSTRUCTIONS.md'),
                validation: path.join(basePath, '.accuracy', 'validation.json')
            };
        }
        
        return paths;
    }
    
    /**
     * Save extraction summary
     */
    saveExtractionSummary(folderPath, metadata, options = {}) {
        const summary = {
            extraction: {
                timestamp: new Date().toISOString(),
                version: 'v12.0.0',
                flags: {
                    nlp: options.nlp || false,
                    vars: options.vars || false,
                    validate: options.validate || false,
                    offline: options.offline || false
                }
            },
            ...metadata,
            folder_structure: {
                convention: 'refined_hierarchy',
                base_path: folderPath,
                improvements: 'removed execution folder level, journey-executionId naming, parent folder reuse',
                files_created: []
            }
        };
        
        // Track which files were created
        if (options.nlp) summary.folder_structure.files_created.push('execution.nlp.txt');
        if (options.vars) summary.folder_structure.files_created.push('variables.json');
        if (options.validate) summary.folder_structure.files_created.push('validation_report.json');
        
        const summaryPath = path.join(folderPath, 'extraction_summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        return summary;
    }
    
    /**
     * Check if extraction folder already exists
     */
    extractionExists(projectId, goalId, executionId, journeyId) {
        const pattern = new RegExp(`execution_${executionId}`);
        
        // Search for existing extraction
        const projectDirs = this.findDirectories(this.baseDir, projectId);
        for (const projectDir of projectDirs) {
            const goalDirs = this.findDirectories(projectDir, goalId);
            for (const goalDir of goalDirs) {
                const execDirs = fs.readdirSync(goalDir).filter(dir => pattern.test(dir));
                if (execDirs.length > 0) {
                    return path.join(goalDir, execDirs[0]);
                }
            }
        }
        
        return null;
    }
    
    /**
     * Find directories matching an ID
     */
    findDirectories(basePath, id) {
        if (!fs.existsSync(basePath)) return [];
        
        return fs.readdirSync(basePath)
            .filter(dir => {
                const fullPath = path.join(basePath, dir);
                return fs.statSync(fullPath).isDirectory() && dir.includes(id);
            })
            .map(dir => path.join(basePath, dir));
    }
    
    /**
     * Clean up empty accuracy folder if no issues
     */
    cleanupAccuracyFolder(basePath) {
        const accuracyPath = path.join(basePath, '.accuracy');
        if (fs.existsSync(accuracyPath)) {
            const files = fs.readdirSync(accuracyPath);
            if (files.length === 0) {
                fs.rmdirSync(accuracyPath);
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get relative path for display
     */
    getRelativePath(fullPath) {
        return path.relative(process.cwd(), fullPath);
    }
}

module.exports = FolderStructure;
#!/usr/bin/env node

/**
 * Migration Script: Convert V10 Structure to V11 Clean Structure
 * 
 * Converts existing extractions from:
 *   extractions/ipermit_testing_4889/demo_15069/...
 * To:
 *   extractions/I-am-tech/iPermit Testing/Demo/...
 * 
 * Usage:
 *   node migrate-folder-structure.js [--dry-run] [--force]
 */

const fs = require('fs');
const path = require('path');

class FolderMigrator {
    constructor(options = {}) {
        this.dryRun = options.dryRun || false;
        this.force = options.force || false;
        this.baseDir = options.baseDir || 'extractions';
        this.backupDir = options.backupDir || 'extractions_backup_migration';
        
        this.migrationStats = {
            processed: 0,
            migrated: 0,
            skipped: 0,
            errors: 0
        };
    }
    
    /**
     * Main migration process
     */
    async migrate() {
        console.log('🔄 Virtuoso Folder Structure Migration V10 → V11\n');
        console.log('=' .repeat(60));
        console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
        console.log(`Source: ${this.baseDir}/`);
        console.log(`Backup: ${this.backupDir}/ (if live mode)`);
        console.log('=' .repeat(60));
        
        if (!fs.existsSync(this.baseDir)) {
            console.log('❌ Source directory not found:', this.baseDir);
            return;
        }
        
        // Create backup if not dry run
        if (!this.dryRun && !this.force) {
            await this.createBackup();
        }
        
        // Find all old-style extraction folders
        const oldExtractions = await this.findOldExtractions();
        
        if (oldExtractions.length === 0) {
            console.log('✅ No old-style extractions found to migrate');
            return;
        }
        
        console.log(`\n📊 Found ${oldExtractions.length} old-style extractions to analyze\n`);
        
        // Process each extraction
        for (const extraction of oldExtractions) {
            await this.migrateExtraction(extraction);
        }
        
        // Print summary
        this.printSummary();
    }
    
    /**
     * Create backup of existing extractions
     */
    async createBackup() {
        if (fs.existsSync(this.backupDir)) {
            console.log(`⚠️ Backup directory already exists: ${this.backupDir}`);
            if (!this.force) {
                console.log('Use --force to overwrite or remove the backup directory');
                process.exit(1);
            }
        }
        
        console.log(`\n📦 Creating backup...`);
        await this.copyDirectory(this.baseDir, this.backupDir);
        console.log(`✅ Backup created: ${this.backupDir}/`);
    }
    
    /**
     * Find all old-style extractions (containing IDs in folder names)
     */
    async findOldExtractions() {
        const extractions = [];
        
        if (!fs.existsSync(this.baseDir)) {
            return extractions;
        }
        
        const items = fs.readdirSync(this.baseDir);
        
        for (const item of items) {
            const itemPath = path.join(this.baseDir, item);
            if (!fs.statSync(itemPath).isDirectory()) continue;
            
            // Check if this looks like an old-style folder (has ID suffix)
            if (this.isOldStyleFolder(item)) {
                const subExtractions = await this.findExtractionDetails(itemPath, item);
                extractions.push(...subExtractions);
            }
        }
        
        return extractions;
    }
    
    /**
     * Check if folder name follows old style (name_id format)
     */
    isOldStyleFolder(folderName) {
        // Old style: project_4889, demo_15069, etc.
        return /^[a-z0-9_]+_\d+$/.test(folderName.toLowerCase());
    }
    
    /**
     * Find detailed extraction information in old-style folder
     */
    async findExtractionDetails(projectPath, projectFolder) {
        const extractions = [];
        
        try {
            const goalFolders = fs.readdirSync(projectPath);
            
            for (const goalFolder of goalFolders) {
                const goalPath = path.join(projectPath, goalFolder);
                if (!fs.statSync(goalPath).isDirectory()) continue;
                
                const executionFolders = fs.readdirSync(goalPath);
                
                for (const executionFolder of executionFolders) {
                    const executionPath = path.join(goalPath, executionFolder);
                    if (!fs.statSync(executionPath).isDirectory()) continue;
                    
                    const journeyFolders = fs.readdirSync(executionPath);
                    
                    for (const journeyFolder of journeyFolders) {
                        const journeyPath = path.join(executionPath, journeyFolder);
                        if (!fs.statSync(journeyPath).isDirectory()) continue;
                        
                        // Check if this has raw_data (indicates complete extraction)
                        const rawDataPath = path.join(journeyPath, 'raw_data');
                        if (fs.existsSync(rawDataPath)) {
                            extractions.push({
                                oldPath: journeyPath,
                                projectFolder,
                                goalFolder,
                                executionFolder,
                                journeyFolder,
                                rawDataPath
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.log(`⚠️ Error scanning ${projectPath}:`, error.message);
        }
        
        return extractions;
    }
    
    /**
     * Migrate a single extraction
     */
    async migrateExtraction(extraction) {
        this.migrationStats.processed++;
        
        try {
            // Load raw data to get clean names
            const rawData = await this.loadRawData(extraction);
            if (!rawData) {
                console.log(`⚠️ Skipping (no raw data): ${extraction.oldPath}`);
                this.migrationStats.skipped++;
                return;
            }
            
            // Generate new clean path
            const newPath = this.generateNewPath(rawData, extraction);
            
            console.log(`📁 ${this.dryRun ? '[DRY RUN] ' : ''}Migrating:`);
            console.log(`   From: ${path.relative(process.cwd(), extraction.oldPath)}`);
            console.log(`   To:   ${path.relative(process.cwd(), newPath)}`);
            
            if (!this.dryRun) {
                // Ensure new directory exists
                await this.ensureDirectoryExists(path.dirname(newPath));
                
                // Move the extraction
                await this.moveDirectory(extraction.oldPath, newPath);
                
                // Create/update metadata.json
                await this.createMetadata(newPath, rawData, extraction);
            }
            
            this.migrationStats.migrated++;
            console.log(`   ✅ ${this.dryRun ? 'Would migrate' : 'Migrated'}`);
            
        } catch (error) {
            console.log(`   ❌ Error:`, error.message);
            this.migrationStats.errors++;
        }
        
        console.log('');
    }
    
    /**
     * Load raw data from extraction
     */
    async loadRawData(extraction) {
        try {
            const rawDataPath = extraction.rawDataPath;
            
            const projectFile = path.join(rawDataPath, 'project.json');
            const goalFile = path.join(rawDataPath, 'goal.json');
            const journeyFile = path.join(rawDataPath, 'journey.json');
            const executionFile = path.join(rawDataPath, 'execution.json');
            const organizationFile = path.join(rawDataPath, 'organization.json');
            
            if (!fs.existsSync(projectFile) || !fs.existsSync(journeyFile)) {
                return null;
            }
            
            const data = {
                project: JSON.parse(fs.readFileSync(projectFile, 'utf8')),
                journey: JSON.parse(fs.readFileSync(journeyFile, 'utf8'))
            };
            
            if (fs.existsSync(goalFile)) {
                data.goal = JSON.parse(fs.readFileSync(goalFile, 'utf8'));
            }
            
            if (fs.existsSync(executionFile)) {
                data.execution = JSON.parse(fs.readFileSync(executionFile, 'utf8'));
            }
            
            if (fs.existsSync(organizationFile)) {
                data.organization = JSON.parse(fs.readFileSync(organizationFile, 'utf8'));
            }
            
            return data;
        } catch (error) {
            console.log(`⚠️ Error loading raw data: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Generate new clean path structure
     */
    generateNewPath(rawData, extraction) {
        // Clean names
        const organizationName = this.cleanName(rawData.organization?.name || 'Unknown Organization');
        const projectName = this.cleanName(rawData.project?.name || 'Unknown Project');
        const goalName = this.cleanName(rawData.goal?.name || 'Unknown Goal');
        const journeyName = this.cleanName(
            rawData.journey?.title || rawData.journey?.name || 'Unknown Journey'
        );
        
        // Extract date and execution info from old execution folder
        // Format: 2025-08-12T22-57-16_execution_173822
        const executionMatch = extraction.executionFolder.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})_execution_(\d+)$/);
        
        let dateFolder = '';
        let executionFolder = '';
        
        if (executionMatch) {
            dateFolder = executionMatch[1]; // 2025-08-12
            const time = `${executionMatch[2]}${executionMatch[3]}${executionMatch[4]}`; // 225716
            const executionId = executionMatch[5]; // 173822
            executionFolder = `${executionId}_${time}`;
        } else {
            // Fallback
            dateFolder = new Date().toISOString().split('T')[0];
            executionFolder = extraction.executionFolder;
        }
        
        return path.join(
            this.baseDir,
            organizationName,
            projectName,
            goalName,
            dateFolder,
            executionFolder,
            journeyName
        );
    }
    
    /**
     * Clean name for folder - human-readable, preserve spaces and case
     */
    cleanName(name) {
        if (!name) return 'Unknown';
        
        return name
            .trim()
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, ' ')
            .replace(/_{2,}/g, '_')
            .trim() || 'Unknown';
    }
    
    /**
     * Create metadata.json for migrated extraction
     */
    async createMetadata(newPath, rawData, extraction) {
        const metadata = {
            extraction_info: {
                timestamp: new Date().toISOString(),
                version: 'v11.0.0',
                structure_type: 'clean_hierarchy',
                migrated_from: 'v10_structure'
            },
            ids: {
                organization: rawData.organization?.id,
                project: rawData.project?.id,
                goal: rawData.goal?.id,
                execution: rawData.execution?.id,
                journey: rawData.journey?.id
            },
            names: {
                organization: rawData.organization?.name,
                project: rawData.project?.name,
                goal: rawData.goal?.name,
                journey: {
                    title: rawData.journey?.title,
                    name: rawData.journey?.name
                }
            },
            paths: {
                organization: path.basename(path.dirname(path.dirname(path.dirname(path.dirname(newPath))))),
                project: path.basename(path.dirname(path.dirname(path.dirname(newPath)))),
                goal: path.basename(path.dirname(path.dirname(newPath))),
                date: path.basename(path.dirname(newPath)),
                execution: path.basename(path.dirname(newPath)),
                journey: path.basename(newPath)
            },
            migration: {
                old_path: extraction.oldPath,
                migrated_at: new Date().toISOString()
            }
        };
        
        const metadataPath = path.join(newPath, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
    
    /**
     * Utility: Copy directory recursively
     */
    async copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const items = fs.readdirSync(src);
        for (const item of items) {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            
            if (fs.statSync(srcPath).isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    /**
     * Utility: Move directory
     */
    async moveDirectory(src, dest) {
        await this.ensureDirectoryExists(path.dirname(dest));
        fs.renameSync(src, dest);
    }
    
    /**
     * Utility: Ensure directory exists
     */
    async ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    /**
     * Print migration summary
     */
    printSummary() {
        console.log('=' .repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('=' .repeat(60));
        console.log(`Total Processed: ${this.migrationStats.processed}`);
        console.log(`✅ Migrated:     ${this.migrationStats.migrated}`);
        console.log(`⚠️ Skipped:      ${this.migrationStats.skipped}`);
        console.log(`❌ Errors:       ${this.migrationStats.errors}`);
        
        if (this.dryRun) {
            console.log('\n💡 This was a dry run. Use without --dry-run to perform migration.');
        } else if (this.migrationStats.migrated > 0) {
            console.log(`\n✅ Migration complete! Backup available at: ${this.backupDir}/`);
        }
        
        console.log('=' .repeat(60));
    }
}

// CLI Interface
function main() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run'),
        force: args.includes('--force')
    };
    
    const migrator = new FolderMigrator(options);
    migrator.migrate().catch(console.error);
}

if (require.main === module) {
    main();
}

module.exports = FolderMigrator;
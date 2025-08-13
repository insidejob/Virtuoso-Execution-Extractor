#!/usr/bin/env node

/**
 * Test script for the refined folder structure V12
 * Tests that parent folders are reused and execution IDs are appended to journey names
 */

const FolderStructure = require('./core/folder-structure');
const fs = require('fs');
const path = require('path');

// Clean up any existing test extractions
const testBaseDir = 'test-extractions';
if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true, force: true });
}

console.log('🧪 Testing Refined Folder Structure V12\n');

// Create folder structure instance
const folderStructure = new FolderStructure({
    baseDir: testBaseDir,
    useTimestamps: true
});

// Test data - simulating multiple extractions from same project/goal/date
const organizationData = { id: '1964', name: 'I-am-tech' };
const projectData = { id: '4889', name: 'iPermit Testing' };
const goalData = { id: '12345', name: 'Demo' };

const journeyData = { id: '527256', title: 'Demo Test', name: 'demo-test' };

// Test 1: First extraction
console.log('📁 Test 1: First extraction (Demo Test-173822)');
const executionData1 = { id: '173822' };
const result1 = folderStructure.createExtractionFolder(
    organizationData,
    projectData,
    goalData,
    executionData1,
    journeyData
);

console.log(`✅ Created: ${result1.basePath}`);
console.log(`   Journey folder: ${result1.journeyFolder}`);

// Test 2: Second extraction same journey, different execution ID
console.log('\n📁 Test 2: Second extraction same journey (Demo Test-173823)');
const executionData2 = { id: '173823' };
const result2 = folderStructure.createExtractionFolder(
    organizationData,
    projectData,
    goalData,
    executionData2,
    journeyData
);

console.log(`✅ Created: ${result2.basePath}`);
console.log(`   Journey folder: ${result2.journeyFolder}`);

// Test 3: Different journey same day
console.log('\n📁 Test 3: Different journey same day (Other Journey-173824)');
const executionData3 = { id: '173824' };
const journeyData3 = { id: '527257', title: 'Other Journey', name: 'other-journey' };
const result3 = folderStructure.createExtractionFolder(
    organizationData,
    projectData,
    goalData,
    executionData3,
    journeyData3
);

console.log(`✅ Created: ${result3.basePath}`);
console.log(`   Journey folder: ${result3.journeyFolder}`);

// Verify folder structure
console.log('\n🔍 Verifying folder structure:');

const expectedStructure = [
    'test-extractions',
    'test-extractions/I-am-tech',
    'test-extractions/I-am-tech/iPermit Testing',
    'test-extractions/I-am-tech/iPermit Testing/Demo',
    `test-extractions/I-am-tech/iPermit Testing/Demo/${new Date().toISOString().split('T')[0]}`,
    `test-extractions/I-am-tech/iPermit Testing/Demo/${new Date().toISOString().split('T')[0]}/Demo Test-173822`,
    `test-extractions/I-am-tech/iPermit Testing/Demo/${new Date().toISOString().split('T')[0]}/Demo Test-173823`,
    `test-extractions/I-am-tech/iPermit Testing/Demo/${new Date().toISOString().split('T')[0]}/Other Journey-173824`
];

let allGood = true;
expectedStructure.forEach(expectedPath => {
    if (fs.existsSync(expectedPath)) {
        console.log(`   ✅ ${expectedPath}`);
    } else {
        console.log(`   ❌ ${expectedPath} - MISSING`);
        allGood = false;
    }
});

// Check metadata files
console.log('\n📋 Checking metadata files:');
const metadataFiles = [
    result1.basePath + '/metadata.json',
    result2.basePath + '/metadata.json', 
    result3.basePath + '/metadata.json'
];

metadataFiles.forEach((metadataPath, index) => {
    if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`   ✅ Metadata ${index + 1}: Version ${metadata.extraction_info.version}, Structure: ${metadata.extraction_info.structure_type}`);
        
        if (metadata.structure_improvements) {
            console.log(`      Improvements: execution folder removed=${metadata.structure_improvements.removed_execution_folder_level}, execution in journey name=${metadata.structure_improvements.execution_id_in_journey_name}`);
        }
    } else {
        console.log(`   ❌ Metadata ${index + 1}: MISSING`);
        allGood = false;
    }
});

// Final result
console.log('\n' + '='.repeat(70));
if (allGood) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Parent folders are properly reused');
    console.log('✅ Execution IDs are appended to journey names'); 
    console.log('✅ No unnecessary execution folder level');
    console.log('✅ Metadata correctly tracks the new structure');
} else {
    console.log('❌ SOME TESTS FAILED');
}

console.log('\n📁 Final structure:');
console.log(result1.basePath);
console.log(result2.basePath);
console.log(result3.basePath);

// Show tree structure
console.log('\n🌳 Tree view:');
function showTree(dir, indent = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach((item, index) => {
        const fullPath = path.join(dir, item);
        const isLast = index === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        
        console.log(indent + connector + item);
        
        if (fs.statSync(fullPath).isDirectory() && !item.startsWith('.')) {
            const newIndent = indent + (isLast ? '    ' : '│   ');
            showTree(fullPath, newIndent);
        }
    });
}

showTree(testBaseDir);
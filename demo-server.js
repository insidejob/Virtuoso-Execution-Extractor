#!/usr/bin/env node

/**
 * Virtuoso Extraction Demo Server
 * 
 * Simple Express server for the Virtuoso extraction demo UI
 * Executes the real extract-v10.js via child process
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the demo UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'demo-ui.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Main extraction endpoint
app.post('/api/extract', async (req, res) => {
    const { apiToken, projectId, url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`📋 Starting extraction for: ${url}`);
    
    // Execute the real extract-v10.js
    const command = `node extract-v10.js "${url}" --all`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Extraction failed:', error.message);
            return res.status(500).json({
                success: false,
                error: error.message,
                stderr: stderr
            });
        }
        
        // Parse the output to find the extraction folder
        const folderMatch = stdout.match(/📁 Output: (.+)/);
        if (!folderMatch) {
            return res.json({
                success: true,
                stdout: stdout,
                message: 'Extraction completed but could not find output folder'
            });
        }
        
        const outputFolder = folderMatch[1].trim();
        console.log(`✅ Extraction complete: ${outputFolder}`);
        
        // Try to read the generated files
        const result = {
            success: true,
            folder: outputFolder,
            stats: {},
            nlp: null,
            variables: null,
            validation: null
        };
        
        // Read NLP file
        try {
            const nlpPath = path.join(outputFolder, 'execution.nlp.txt');
            if (fs.existsSync(nlpPath)) {
                result.nlp = fs.readFileSync(nlpPath, 'utf8');
                result.stats.steps = (result.nlp.match(/\n/g) || []).length;
            }
        } catch (e) {
            console.log('Could not read NLP file:', e.message);
        }
        
        // Read variables file
        try {
            const varsPath = path.join(outputFolder, 'variables.json');
            if (fs.existsSync(varsPath)) {
                const varsData = JSON.parse(fs.readFileSync(varsPath, 'utf8'));
                result.variables = varsData;
                result.stats.variables = varsData.summary?.total_used || 0;
            }
        } catch (e) {
            console.log('Could not read variables file:', e.message);
        }
        
        // Read validation file
        try {
            const validationPath = path.join(outputFolder, 'validation_report.json');
            if (fs.existsSync(validationPath)) {
                const validationData = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
                result.validation = validationData;
                result.stats.accuracy = validationData.summary?.accuracy || 0;
                result.stats.checkpoints = validationData.summary?.checkpointCount || 0;
            }
        } catch (e) {
            console.log('Could not read validation file:', e.message);
        }
        
        // Parse timing from stdout
        const timingMatch = stdout.match(/Total Time: (\d+)ms/);
        if (timingMatch) {
            result.stats.duration = parseInt(timingMatch[1]);
        }
        
        res.json(result);
    });
});

// Start server
app.listen(port, () => {
    console.log('🚀 Virtuoso Extraction Demo Server Started');
    console.log('='.repeat(60));
    console.log(`📡 Server running on: http://localhost:${port}`);
    console.log(`🎨 Demo UI available at: http://localhost:${port}`);
    console.log(`🔍 Health check: http://localhost:${port}/health`);
    console.log('='.repeat(60));
    console.log('Ready to handle extraction requests! 🎯');
});
const { VirtuosoAPIClient } = require('../src/client');

// Example: List all projects
async function listProjectsExample(client) {
    console.log('📁 Fetching all projects...\n');
    
    try {
        const response = await client.listProjects();
        const projects = response.data;
        
        if (!projects || projects.length === 0) {
            console.log('No projects found');
            return [];
        }
        
        console.log(`Found ${projects.length} project(s):\n`);
        projects.forEach((project, index) => {
            console.log(`${index + 1}. ${project.name}`);
            console.log(`   ID: ${project.id}`);
            console.log(`   Organization: ${project.organizationId}`);
            console.log('');
        });
        
        return projects;
    } catch (error) {
        console.error('❌ Failed to fetch projects:', error.message);
        throw error;
    }
}

// Example: Get project goals
async function getProjectGoalsExample(client, projectId) {
    console.log(`🎯 Fetching goals for project: ${projectId}\n`);
    
    try {
        const response = await client.listGoals(projectId);
        const goals = response.data;
        
        if (!goals || goals.length === 0) {
            console.log('No goals found for this project');
            return [];
        }
        
        console.log(`Found ${goals.length} goal(s):\n`);
        goals.forEach((goal, index) => {
            console.log(`${index + 1}. ${goal.name}`);
            console.log(`   ID: ${goal.id}`);
            console.log(`   Project: ${goal.projectId}`);
            if (goal.description) {
                console.log(`   Description: ${goal.description}`);
            }
            console.log('');
        });
        
        return goals;
    } catch (error) {
        console.error('❌ Failed to fetch goals:', error.message);
        throw error;
    }
}

// Example: Execute a goal
async function executeGoalExample(client, goalId, options = {}) {
    console.log(`🚀 Executing goal: ${goalId}\n`);
    
    // Example initial data for test execution
    const executionOptions = {
        initialData: {
            testEnvironment: 'staging',
            testUser: 'automation@example.com',
            ...options.initialData
        },
        httpHeaders: options.httpHeaders,
        startingUrl: options.startingUrl
    };
    
    try {
        console.log('Execution options:', JSON.stringify(executionOptions, null, 2));
        console.log('\nStarting execution...');
        
        const response = await client.executeGoal(goalId, executionOptions);
        
        console.log('✅ Goal execution started successfully!');
        console.log('Execution details:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('❌ Failed to execute goal:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        throw error;
    }
}

// Example: Monitor active jobs
async function monitorJobsExample(client, projectId) {
    console.log(`📊 Monitoring active jobs for project: ${projectId}\n`);
    
    try {
        const response = await client.listJobs(projectId);
        const jobs = response.data;
        
        if (!jobs || jobs.length === 0) {
            console.log('No active jobs found');
            return [];
        }
        
        console.log(`Found ${jobs.length} active job(s):\n`);
        jobs.forEach((job, index) => {
            console.log(`${index + 1}. Job ID: ${job.id}`);
            console.log(`   Status: ${job.status}`);
            console.log(`   Started: ${job.startedAt}`);
            if (job.progress) {
                console.log(`   Progress: ${job.progress}%`);
            }
            console.log('');
        });
        
        return jobs;
    } catch (error) {
        console.error('❌ Failed to fetch jobs:', error.message);
        throw error;
    }
}

// Example: Get project snapshots
async function getSnapshotsExample(client, projectId) {
    console.log(`📸 Fetching snapshots for project: ${projectId}\n`);
    
    try {
        const response = await client.listSnapshots(projectId);
        const snapshots = response.data;
        
        if (!snapshots || snapshots.length === 0) {
            console.log('No snapshots found');
            return [];
        }
        
        console.log(`Found ${snapshots.length} snapshot(s):\n`);
        snapshots.forEach((snapshot, index) => {
            console.log(`${index + 1}. ${snapshot.name}`);
            console.log(`   ID: ${snapshot.id}`);
            console.log(`   Created: ${snapshot.createdAt}`);
            if (snapshot.description) {
                console.log(`   Description: ${snapshot.description}`);
            }
            console.log('');
        });
        
        return snapshots;
    } catch (error) {
        console.error('❌ Failed to fetch snapshots:', error.message);
        throw error;
    }
}

// Example: Complete project workflow
async function completeWorkflowExample() {
    const token = process.env.VIRTUOSO_API_TOKEN;
    if (!token) {
        console.error('⚠️  VIRTUOSO_API_TOKEN environment variable is required');
        return;
    }
    
    const client = new VirtuosoAPIClient(token);
    
    try {
        // 1. List all projects
        const projects = await listProjectsExample(client);
        if (projects.length === 0) return;
        
        // Use first project for demo
        const projectId = projects[0].id;
        console.log(`\n${'='.repeat(60)}\n`);
        
        // 2. Get project goals
        const goals = await getProjectGoalsExample(client, projectId);
        console.log(`\n${'='.repeat(60)}\n`);
        
        // 3. Get project snapshots
        await getSnapshotsExample(client, projectId);
        console.log(`\n${'='.repeat(60)}\n`);
        
        // 4. Monitor active jobs
        await monitorJobsExample(client, projectId);
        console.log(`\n${'='.repeat(60)}\n`);
        
        // 5. Execute a goal (optional - uncomment to run)
        // if (goals.length > 0) {
        //     await executeGoalExample(client, goals[0].id, {
        //         initialData: {
        //             testRun: 'example',
        //             timestamp: new Date().toISOString()
        //         }
        //     });
        // }
        
        console.log('✅ Workflow completed successfully!');
        
    } catch (error) {
        console.error('❌ Workflow failed:', error.message);
    }
}

// Run examples if executed directly
if (require.main === module) {
    console.log('🚀 Virtuoso Project API Examples\n');
    console.log('=' .repeat(60) + '\n');
    
    completeWorkflowExample();
}

module.exports = {
    listProjectsExample,
    getProjectGoalsExample,
    executeGoalExample,
    monitorJobsExample,
    getSnapshotsExample,
    completeWorkflowExample
};
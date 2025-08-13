const { VirtuosoTestingExtensions } = require('../src/client');

// Example: API_GET usage in test journeys
async function apiGetExample() {
    console.log('📥 API_GET Example\n');
    
    // Simple GET request
    const simpleExample = `
    // Fetch user data
    API_GET("https://reqres.in/api/users/2") returning $user
    assert $user.data.email equals "janet.weaver@reqres.in"
    `;
    
    // GET with query parameters
    const withParamsExample = `
    // Fetch paginated data
    API_GET("https://reqres.in/api/users?page=2&per_page=3") returning $users
    assert $users.page equals "2"
    assert $users.per_page equals "3"
    `;
    
    // GET with authentication headers
    const withAuthExample = `
    // Prepare authentication
    store value "YOUR_API_TOKEN" in $token
    store value '{"Authorization": "Bearer ' + $token + '"}' in $headers
    
    // Fetch protected resource
    API_GET("https://api.example.com/protected/resource", $headers) returning $data
    assert $data.status equals "success"
    `;
    
    console.log('Simple GET:', simpleExample);
    console.log('\nWith Query Parameters:', withParamsExample);
    console.log('\nWith Authentication:', withAuthExample);
}

// Example: API_POST usage in test journeys
async function apiPostExample() {
    console.log('📤 API_POST Example\n');
    
    // Simple POST with JSON string
    const simpleExample = `
    // Create new user
    API_POST("https://reqres.in/api/users", '{"name":"John","job":"Developer"}') returning $response
    assert $response.name equals "John"
    store value $response.id in $userId
    `;
    
    // POST with variable as body
    const withVariableExample = `
    // Prepare request body
    store value "Jane Doe" in $request.name
    store value "jane@example.com" in $request.email
    store value "QA Engineer" in $request.job
    
    // Send POST request
    API_POST("https://reqres.in/api/users", $request) returning $response
    assert $response.name equals "Jane Doe"
    `;
    
    // POST with authentication and custom headers
    const withFullHeadersExample = `
    // Prepare authentication and headers
    store value "YOUR_API_TOKEN" in $token
    store value '{"Authorization": "Bearer ' + $token + '", "Content-Type": "application/json"}' in $headers
    
    // Prepare body
    store value '{"title":"Test Post","content":"Test content"}' in $body
    
    // Send authenticated POST
    API_POST("https://api.example.com/posts", $body, $headers) returning $post
    assert $post.status equals "created"
    `;
    
    console.log('Simple POST:', simpleExample);
    console.log('\nWith Variable Body:', withVariableExample);
    console.log('\nWith Full Headers:', withFullHeadersExample);
}

// Example: API_PUT usage in test journeys
async function apiPutExample() {
    console.log('✏️ API_PUT Example\n');
    
    // Update existing resource
    const updateExample = `
    // Update user information
    API_PUT("https://reqres.in/api/users/2", '{"name":"Updated Name","job":"Senior Developer"}') returning $response
    assert $response.name equals "Updated Name"
    assert $response.job equals "Senior Developer"
    `;
    
    // Partial update with variables
    const partialUpdateExample = `
    // Get existing user first
    API_GET("https://api.example.com/users/123") returning $existingUser
    
    // Modify specific fields
    store value $existingUser in $updateData
    store value "New Title" in $updateData.title
    store value "Updated" in $updateData.status
    
    // Send update
    API_PUT("https://api.example.com/users/123", $updateData) returning $updated
    assert $updated.title equals "New Title"
    `;
    
    console.log('Update Resource:', updateExample);
    console.log('\nPartial Update:', partialUpdateExample);
}

// Example: API_DELETE usage in test journeys
async function apiDeleteExample() {
    console.log('🗑️ API_DELETE Example\n');
    
    // Simple DELETE
    const simpleExample = `
    // Delete a user
    API_DELETE("https://reqres.in/api/users/2") returning $response
    // Note: Successful DELETE often returns 204 with no content
    `;
    
    // DELETE with verification
    const withVerificationExample = `
    // Create a resource first
    API_POST("https://api.example.com/items", '{"name":"Temp Item"}') returning $item
    store value $item.id in $itemId
    
    // Delete the resource
    API_DELETE("https://api.example.com/items/" + $itemId) returning $deleteResponse
    
    // Verify deletion
    API_GET("https://api.example.com/items/" + $itemId) returning $checkResponse
    assert $checkResponse.status equals "404"
    `;
    
    console.log('Simple DELETE:', simpleExample);
    console.log('\nWith Verification:', withVerificationExample);
}

// Example: Complete API testing workflow
async function completeAPITestWorkflow() {
    console.log('🔄 Complete API Testing Workflow Example\n');
    
    const workflow = `
    // ========================================
    // Complete CRUD Testing Workflow
    // ========================================
    
    // 1. Setup - Store authentication token
    store value "YOUR_API_TOKEN" in $token
    store value '{"Authorization": "Bearer ' + $token + '"}' in $headers
    
    // 2. CREATE - Post new resource
    store value "Test Product" in $product.name
    store value "This is a test product" in $product.description
    store value 99.99 in $product.price
    
    API_POST("https://api.example.com/products", $product, $headers) returning $createdProduct
    assert $createdProduct.name equals "Test Product"
    store value $createdProduct.id in $productId
    
    // 3. READ - Get the created resource
    API_GET("https://api.example.com/products/" + $productId, $headers) returning $fetchedProduct
    assert $fetchedProduct.id equals $productId
    assert $fetchedProduct.name equals "Test Product"
    
    // 4. UPDATE - Modify the resource
    store value "Updated Product" in $updateData.name
    store value 149.99 in $updateData.price
    
    API_PUT("https://api.example.com/products/" + $productId, $updateData, $headers) returning $updatedProduct
    assert $updatedProduct.name equals "Updated Product"
    assert $updatedProduct.price equals 149.99
    
    // 5. LIST - Get all resources with pagination
    API_GET("https://api.example.com/products?page=1&limit=10", $headers) returning $productList
    assert $productList.data contains $productId
    
    // 6. DELETE - Remove the resource
    API_DELETE("https://api.example.com/products/" + $productId, $headers) returning $deleteResponse
    
    // 7. VERIFY - Confirm deletion
    API_GET("https://api.example.com/products/" + $productId, $headers) returning $verifyResponse
    assert $verifyResponse.status equals 404
    `;
    
    console.log(workflow);
}

// Example: Error handling patterns
async function errorHandlingExample() {
    console.log('⚠️ Error Handling Patterns\n');
    
    const patterns = `
    // ========================================
    // API Error Handling Patterns
    // ========================================
    
    // 1. Check for specific error codes
    API_GET("https://api.example.com/restricted") returning $response
    if $response.status equals "401"
        log "Authentication required"
        // Refresh token logic here
    end if
    
    // 2. Validate response structure
    API_GET("https://api.example.com/users/999") returning $user
    if $user.error exists
        log "User not found: " + $user.error.message
        // Handle missing user scenario
    else
        assert $user.data.id exists
    end if
    
    // 3. Retry on failure pattern
    store value 0 in $retryCount
    store value false in $success
    
    while $retryCount less than 3 and $success equals false
        API_POST("https://api.example.com/process", $data) returning $result
        if $result.status equals "200"
            store value true in $success
        else
            store value $retryCount + 1 in $retryCount
            wait 2 seconds
        end if
    end while
    
    assert $success equals true
    
    // 4. Timeout handling
    store value current timestamp in $startTime
    API_GET("https://slow-api.example.com/data") returning $data
    store value current timestamp in $endTime
    
    if ($endTime - $startTime) greater than 5000
        log "API response took too long"
        // Handle timeout scenario
    end if
    `;
    
    console.log(patterns);
}

// Example: API chaining and data flow
async function apiChainingExample() {
    console.log('🔗 API Chaining Example\n');
    
    const chaining = `
    // ========================================
    // API Chaining and Data Flow
    // ========================================
    
    // 1. Login and get token
    store value "user@example.com" in $credentials.email
    store value "password123" in $credentials.password
    API_POST("https://api.example.com/auth/login", $credentials) returning $auth
    store value $auth.token in $token
    store value '{"Authorization": "Bearer ' + $token + '"}' in $headers
    
    // 2. Get user profile using token
    API_GET("https://api.example.com/users/me", $headers) returning $profile
    store value $profile.id in $userId
    
    // 3. Get user's projects
    API_GET("https://api.example.com/users/" + $userId + "/projects", $headers) returning $projects
    store value $projects.data[0].id in $projectId
    
    // 4. Get project details
    API_GET("https://api.example.com/projects/" + $projectId, $headers) returning $projectDetails
    
    // 5. Create a new task in the project
    store value "New Task from API Test" in $task.title
    store value $projectId in $task.projectId
    store value $userId in $task.assignedTo
    API_POST("https://api.example.com/tasks", $task, $headers) returning $createdTask
    
    // 6. Verify task was created
    assert $createdTask.title equals "New Task from API Test"
    assert $createdTask.projectId equals $projectId
    `;
    
    console.log(chaining);
}

// Run examples if executed directly
if (require.main === module) {
    console.log('🚀 Virtuoso API Testing Examples\n');
    console.log('=' .repeat(60) + '\n');
    
    apiGetExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    apiPostExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    apiPutExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    apiDeleteExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    completeAPITestWorkflow();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    errorHandlingExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    apiChainingExample();
    
    console.log('\n✅ All testing examples displayed!');
}

module.exports = {
    apiGetExample,
    apiPostExample,
    apiPutExample,
    apiDeleteExample,
    completeAPITestWorkflow,
    errorHandlingExample,
    apiChainingExample
};
# Virtuoso Extraction Tool - Demo Setup

A professional, modern demo interface for the Virtuoso Extraction tool with real-time progress tracking and beautiful UI.

## Features

### 🎨 Professional UI
- Modern gradient design with card-based layout
- Responsive design that works on all screen sizes
- Loading animations and progress indicators
- Syntax-highlighted NLP output
- Professional color scheme and typography

### ⚡ Real-time Progress
- WebSocket-based real-time updates
- 5-step progress indicator with visual feedback
- Live status updates during extraction
- Professional error handling and display

### 📊 Rich Results Display
- Extraction summary with key metrics
- Tabbed interface for different data views:
  - **Overview**: Key journey details and status
  - **NLP Output**: Syntax-highlighted natural language processing results
  - **Variables**: Interactive cards showing extracted variables with types
  - **Raw Data**: Complete JSON data with syntax highlighting

### 🔧 Full Integration
- Real extraction using your existing V10 extractor
- Fallback to simulation mode for demos
- RESTful API endpoints for integration
- Background processing with progress tracking

## Quick Start

### 1. Install Dependencies

```bash
npm install express socket.io
```

### 2. Start the Demo Server

```bash
# Start on default port 3000
npm run demo:ui

# Or start on custom port
node demo-server.js --port 8080
```

### 3. Access the Demo

Open your browser to:
- **Default**: http://localhost:3000
- **Custom port**: http://localhost:8080

## Usage

### Demo Mode (Simulation)
1. Fill in the form fields (pre-populated with demo data)
2. Click "Start Extraction"
3. Watch the real-time progress indicator
4. View results in the tabbed interface

### Production Mode (Real Extraction)
1. Ensure your Virtuoso API credentials are configured
2. Enter a valid Virtuoso URL
3. The system will automatically use real extraction
4. Falls back to simulation if API is unavailable

## API Endpoints

The demo server provides several REST endpoints:

### Start Extraction
```http
POST /api/extract
Content-Type: application/json

{
  "apiToken": "your-api-token",
  "projectId": "4889",
  "virtuosoUrl": "https://app2.virtuoso.qa/#/project/4889/execution/173822/journey/527229"
}
```

### Get Status
```http
GET /api/extract/{extractionId}/status
```

### Get Results
```http
GET /api/extract/{extractionId}/results
```

### List Extractions
```http
GET /api/extractions
```

### Health Check
```http
GET /health
```

## Architecture

### Frontend (demo-ui.html)
- Single-page application with vanilla JavaScript
- WebSocket integration for real-time updates
- Responsive CSS with modern design patterns
- Prism.js for syntax highlighting
- Automatic fallback to simulation mode

### Backend (demo-server.js)
- Express.js server with Socket.IO for real-time communication
- Integration with existing VirtuosoExtractorV10 class
- Background processing with progress tracking
- RESTful API design
- Automatic cleanup of old extractions

### File Structure
```
virtuoso-api/
├── demo-ui.html          # Main demo interface
├── demo-server.js        # Express server with Socket.IO
├── extract-v10.js        # Your existing extractor (integrated)
├── package.json          # Dependencies and scripts
└── extractions/          # Extraction outputs (served statically)
```

## Customization

### Colors and Branding
Edit the CSS variables in `demo-ui.html`:
```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #10b981;
  --error-color: #dc2626;
}
```

### Progress Steps
Modify the steps array in the JavaScript:
```javascript
const stepNames = [
  'Initializing...',
  'Connecting to API...',
  'Fetching data...',
  'Processing NLP...',
  'Extracting variables...',
  'Complete!'
];
```

### Server Configuration
Configure the server in `demo-server.js`:
```javascript
const server = new DemoServer({
  port: 3000,
  extractionTimeout: 300000,  // 5 minutes
  maxConcurrentExtractions: 5
});
```

## Production Deployment

For production use:

1. **Environment Variables**:
```bash
export NODE_ENV=production
export PORT=3000
export VIRTUOSO_API_TOKEN=your-token
```

2. **Process Management**:
```bash
# Using PM2
npm install -g pm2
pm2 start demo-server.js --name virtuoso-demo

# Using Docker
docker build -t virtuoso-demo .
docker run -p 3000:3000 virtuoso-demo
```

3. **Security Considerations**:
- Add rate limiting
- Implement authentication
- Use HTTPS in production
- Add CORS configuration
- Sanitize user inputs

## Troubleshooting

### Common Issues

**Socket.IO not connecting**:
- Check that the server is running
- Verify port configuration
- Check browser console for errors

**Extraction fails**:
- Verify API token is correct
- Check Virtuoso URL format
- Review server logs for detailed errors

**Results not displaying**:
- Check extraction folder permissions
- Verify JSON parsing is successful
- Check browser network tab for failed requests

### Debug Mode

Start the server with debug logging:
```bash
DEBUG=* node demo-server.js
```

## Demo Features Showcase

### 1. Professional Design
- Modern card-based layout
- Gradient backgrounds
- Smooth animations and transitions
- Mobile-responsive design

### 2. Real-time Progress
- WebSocket-based live updates
- Visual progress bar with percentages
- Step-by-step status indicators
- Professional loading states

### 3. Rich Data Visualization
- Syntax-highlighted code display
- Interactive variable cards
- Organized data tabs
- Summary metrics dashboard

### 4. Error Handling
- Graceful fallback to simulation
- User-friendly error messages
- Automatic retry mechanisms
- Detailed error logging

This demo interface showcases the Virtuoso Extraction tool's capabilities in a professional, polished way that's perfect for demonstrations, client presentations, and development testing.
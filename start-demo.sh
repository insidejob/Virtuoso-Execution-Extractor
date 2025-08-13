#!/bin/bash

echo "🚀 Virtuoso Extraction Tool Demo"
echo ""

# Check if --server flag is provided
if [[ "$1" == "--server" ]]; then
    echo "🖥️  Starting demo server with REAL extraction capabilities..."
    echo ""
    echo "📡 Server will run at: http://localhost:3000"
    echo "🎨 Demo UI will be available at: http://localhost:3000"
    echo "🔍 Health check: http://localhost:3000/health"
    echo ""
    echo "💡 This will perform REAL extractions using extract-v10.js!"
    echo ""
    
    # Start the demo server
    node demo-server.js
else
    echo "📁 Opening demo UI (simulation mode)..."
    echo "📍 Location: $(pwd)/demo-ui.html"
    echo ""
    
    # Open in default browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open demo-ui.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open demo-ui.html
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        start demo-ui.html
    else
        echo "⚠️  Please open demo-ui.html manually in your browser"
    fi
    
    echo "✅ Demo UI launched in browser!"
    echo ""
    echo "💡 This opens the standalone demo with simulated data."
    echo ""
fi

echo "📝 Demo Features:"
echo "  • Beautiful gradient UI design"
echo "  • Real-time progress tracking"
echo "  • Animated statistics display"
echo "  • Syntax-highlighted NLP output"
echo "  • Pre-filled with working example data"
if [[ "$1" == "--server" ]]; then
    echo "  • REAL extraction with live progress updates!"
    echo "  • WebSocket real-time communication"
    echo "  • Actual NLP and variable extraction"
else
    echo "  • Simulated extraction for demo purposes"
fi
echo ""
echo "Usage:"
echo "  ./start-demo.sh          # Standalone demo (simulation)"
echo "  ./start-demo.sh --server # Demo server (real extractions)"
echo ""
echo "Requirements for real extractions:"
echo "  • Valid Virtuoso API token in form"
echo "  • Working internet connection"
echo "  • Node.js dependencies: npm install"
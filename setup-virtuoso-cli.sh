#!/bin/bash

# Virtuoso CLI Setup Script
# Sets up environment variables and installs the CLI

echo "🚀 Virtuoso CLI Setup"
echo "===================="
echo ""

# Function to add to shell profile
add_to_profile() {
    local profile=$1
    local line=$2
    
    if ! grep -q "$line" "$profile" 2>/dev/null; then
        echo "$line" >> "$profile"
        return 0
    fi
    return 1
}

# Detect shell and profile file
if [ -n "$ZSH_VERSION" ]; then
    PROFILE="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    PROFILE="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    PROFILE="$HOME/.profile"
    SHELL_NAME="sh"
fi

echo "Detected shell: $SHELL_NAME"
echo "Profile file: $PROFILE"
echo ""

# Get current token and session from browser
echo "📋 Current Configuration"
echo "------------------------"
echo ""
echo "To get your token and session ID:"
echo "1. Open Chrome/Firefox DevTools (F12)"
echo "2. Go to Network tab"
echo "3. Make any request in Virtuoso UI"
echo "4. Find the request and check Headers"
echo ""
echo "Look for:"
echo "  • Authorization: Bearer <TOKEN>"
echo "  • x-v-session-id: <SESSION_ID>"
echo ""

# Ask for token
echo -n "Enter your Virtuoso API token: "
read VIRTUOSO_TOKEN

# Ask for session ID
echo -n "Enter your Virtuoso session ID: "
read VIRTUOSO_SESSION

# Ask for client ID (optional)
echo -n "Enter your Virtuoso client ID (press Enter to use default): "
read VIRTUOSO_CLIENT

if [ -z "$VIRTUOSO_CLIENT" ]; then
    VIRTUOSO_CLIENT="1754647483711_e9e9c12_production"
fi

# Add to profile
echo ""
echo "📝 Adding environment variables to $PROFILE..."

added=0
add_to_profile "$PROFILE" "# Virtuoso CLI Configuration" && added=1
add_to_profile "$PROFILE" "export VIRTUOSO_TOKEN='$VIRTUOSO_TOKEN'" && added=1
add_to_profile "$PROFILE" "export VIRTUOSO_SESSION='$VIRTUOSO_SESSION'" && added=1
add_to_profile "$PROFILE" "export VIRTUOSO_CLIENT='$VIRTUOSO_CLIENT'" && added=1

if [ $added -gt 0 ]; then
    echo "✅ Environment variables added to $PROFILE"
else
    echo "ℹ️  Environment variables already configured"
fi

# Export for current session
export VIRTUOSO_TOKEN="$VIRTUOSO_TOKEN"
export VIRTUOSO_SESSION="$VIRTUOSO_SESSION"
export VIRTUOSO_CLIENT="$VIRTUOSO_CLIENT"

# Make CLI executable
chmod +x virtuoso-cli-wrapper.js
echo "✅ CLI wrapper made executable"

# Create symlink for global access (optional)
echo ""
echo -n "Do you want to install virtuoso-cli globally? (y/n): "
read install_global

if [ "$install_global" = "y" ] || [ "$install_global" = "Y" ]; then
    # Try to install with npm
    if command -v npm &> /dev/null; then
        echo "Installing with npm..."
        npm install -g .
        echo "✅ Installed globally as 'virtuoso' command"
    else
        # Fallback to symlink
        echo "Creating symlink in /usr/local/bin..."
        sudo ln -sf "$(pwd)/virtuoso-cli-wrapper.js" /usr/local/bin/virtuoso
        echo "✅ Installed globally as 'virtuoso' command"
    fi
fi

echo ""
echo "===================="
echo "✅ Setup Complete!"
echo "===================="
echo ""
echo "To use the CLI:"
echo ""
echo "1. Reload your shell configuration:"
echo "   source $PROFILE"
echo ""
echo "2. Test the CLI:"
echo "   ./virtuoso-cli-wrapper.js --help"
echo ""
if [ "$install_global" = "y" ] || [ "$install_global" = "Y" ]; then
    echo "   Or globally:"
    echo "   virtuoso --help"
    echo ""
fi
echo "3. Extract and convert to NLP:"
echo "   ./virtuoso-cli-wrapper.js <URL> --nlp"
echo ""
echo "Example:"
echo "   ./virtuoso-cli-wrapper.js 'https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218' --nlp"
echo ""
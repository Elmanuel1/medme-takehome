#!/bin/bash

# MedMe AI Widget Setup Script
# This script updates the demo page with your actual Retell AI credentials

echo "🤖 Setting up MedMe AI Widget Demo..."

# Check if environment variables are set
if [ -z "$RETELL_PUBLIC_KEY" ]; then
    echo "❌ RETELL_PUBLIC_KEY environment variable not found"
    echo "Please set it: export RETELL_PUBLIC_KEY=your_key_here"
    exit 1
fi

if [ -z "$RETELL_AGENT_ID" ]; then
    echo "❌ RETELL_AGENT_ID environment variable not found"
    echo "Please set it: export RETELL_AGENT_ID=your_agent_id_here"
    exit 1
fi

# Update the HTML file with actual values
sed -i.bak "s/YOUR_RETELL_PUBLIC_KEY/$RETELL_PUBLIC_KEY/g" demo/index.html
sed -i.bak "s/YOUR_CHAT_AGENT_ID/$RETELL_AGENT_ID/g" demo/index.html

echo "✅ Widget configured successfully!"
echo "📋 Configuration:"
echo "   Public Key: $RETELL_PUBLIC_KEY"
echo "   Agent ID: $RETELL_AGENT_ID"
echo ""
echo "🌐 Next steps:"
echo "   1. Open demo/index.html in a browser"
echo "   2. Or deploy to GitHub Pages/Vercel/Netlify"
echo "   3. Look for the floating button in bottom-right corner"
echo ""
echo "🧪 Test the widget by clicking the floating button and trying:"
echo "   • 'I want to book an appointment for Monday at 2 PM'"
echo "   • 'Do you have any appointments available tomorrow?'"
echo "   • 'I need to reschedule my existing appointment'"

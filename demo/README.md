# MedMe AI Receptionist Demo

A live demo page for testing the MedMe AI-powered medical appointment booking system.

## 🚀 Quick Setup

### 1. Set Environment Variables
```bash
export RETELL_PUBLIC_KEY="key_xxxxxxxxxxxxxxxxxxxxx"
export RETELL_AGENT_ID="agent_xxxxxxxxxxxxxxxxxxx"
```

### 2. Configure Widget
```bash
./setup-widget.sh
```

### 3. Open Demo
Open `index.html` in your browser or deploy to a hosting platform.

## 🌐 Deployment Options

### GitHub Pages
1. Push to GitHub repository
2. Go to Settings → Pages
3. Select source branch
4. Your demo will be available at `https://username.github.io/repo-name/demo/`

### Vercel
```bash
npx vercel deploy demo/
```

### Netlify
```bash
npx netlify deploy --dir=demo/ --prod
```

## 🧪 Testing Scenarios

Try these voice commands with the widget:

### Basic Booking
- "I'd like to schedule a consultation for next Monday at 2 PM"
- "Book me an appointment for tomorrow morning"

### Rescheduling  
- "I need to move my appointment to a different time"
- "Can I reschedule my Tuesday appointment?"

### Availability Check
- "What times do you have available this week?"
- "Do you have any morning slots on Friday?"

### Appointment Management
- "Show me my upcoming appointments"
- "I want to cancel my appointment for tomorrow"

## 🎯 Widget Features

Based on the [Retell AI documentation](https://docs.retellai.com/deploy/chat-widget):

- **Chat Interface**: Text-based conversation with your AI agent
- **Floating Button**: Appears in bottom-right corner with robot icon
- **Custom Branding**: MedMe colors and CareConnect bot name
- **Auto Popup**: Friendly greeting message after 3 seconds
- **Responsive**: Works on desktop and mobile devices

## 🔧 Customization

Edit `index.html` to customize:

- `data-title`: Widget window title
- `data-color`: Theme color (hex code)
- `data-bot-name`: AI assistant name
- `data-popup-message`: Welcome message
- `data-show-ai-popup-time`: Popup delay in seconds

## 📋 Requirements

- **Chat Agent**: Must be created in Retell AI dashboard
- **Public Key**: Available in Retell AI account settings
- **Agent ID**: From your chat agent configuration
- **HTTPS**: Required for production deployment

## 🔒 Security Notes

- Uses Retell's public key system (safe for frontend)
- No backend proxy required
- Optional reCAPTCHA v3 protection available
- All conversations handled securely by Retell AI

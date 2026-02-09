# ngrok Setup Guide

## Quick Setup (2 Steps)

### Step 1: Get Auth Token

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up (free account)
3. Copy your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken

### Step 2: Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Replace `YOUR_AUTH_TOKEN_HERE` with the token you copied.

### Step 3: Start Tunnel

```bash
ngrok http 3000
```

This will give you a URL like: `https://abc123.ngrok-free.app`

## Update .env

Once ngrok is running, copy the HTTPS URL and update your `.env` file:

```bash
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
```

## Alternative: Use Localhost (Testing Only)

If you're running the SurvAI app locally, you can use localhost instead:

```bash
# In .env
SURVAI_API_BASE_URL=http://localhost:5173
WEBHOOK_BASE_URL=http://localhost:3000
```

⚠️ **Note**: This only works if the SurvAI server is running on the same machine.

## Alternative: Cloud Deployment

For production use, deploy the webhook server to:

- **Fly.io** (free tier available)
- **Railway** (free tier available)
- **Render** (free tier available)
- **Heroku** (paid)

Then use the public URL as `WEBHOOK_BASE_URL`.

## Troubleshooting

### "command not found: ngrok"
- Already fixed! ngrok is installed.

### "authentication token required"
```bash
ngrok config add-authtoken YOUR_TOKEN
```

### ngrok keeps disconnecting
Free tier has 40 requests/minute limit. Upgrade to paid plan if needed.

### Can't access webhook endpoint
1. Check ngrok is running
2. Verify URL in .env matches ngrok output
3. Check firewall isn't blocking port 3000

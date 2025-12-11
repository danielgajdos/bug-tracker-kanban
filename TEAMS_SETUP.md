# Microsoft Teams Integration Setup Guide

This guide will help you set up the Microsoft Teams integration for automatic bug ticket creation.

## Prerequisites

1. Microsoft 365 account with Teams access
2. Azure subscription (free tier is sufficient)
3. Admin access to register applications in Azure AD

## Step 1: Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Bug Tracker Teams Bot
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Leave blank for now
5. Click **Register**

## Step 2: Configure Application Permissions

1. In your registered app, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions**
5. Add these permissions:
   - `ChannelMessage.Read.All`
   - `Chat.Read.All`
   - `Files.Read.All`
   - `Team.ReadBasic.All`
   - `User.Read.All`
6. Click **Grant admin consent** (requires admin privileges)

## Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: "Bug Tracker Bot Secret"
4. Choose expiration (recommend 24 months)
5. Click **Add**
6. **Copy the secret value immediately** (you won't see it again)

## Step 4: Register Teams Bot

1. Go to [Bot Framework Portal](https://dev.botframework.com/)
2. Click **Create a Bot**
3. Choose **Register an existing bot built using Bot Framework SDK**
4. Fill in:
   - **Bot handle**: bug-tracker-bot (must be unique)
   - **Display name**: Bug Tracker Bot
   - **Description**: Automatically creates bug tickets from Teams messages
   - **Messaging endpoint**: `https://your-railway-app.up.railway.app/api/teams/messages`
   - **Microsoft App ID**: Use the Application ID from Step 1
5. Click **Register**

## Step 5: Configure Teams Channel

1. In Bot Framework Portal, go to your bot
2. Click **Channels**
3. Click **Microsoft Teams** icon
4. Click **Save**
5. Copy the **Teams App ID** for later use

## Step 6: Create Teams App Manifest

Create a `manifest.json` file:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_TEAMS_APP_ID",
  "packageName": "com.bugtracker.teamsbot",
  "developer": {
    "name": "Bug Tracker",
    "websiteUrl": "https://your-railway-app.up.railway.app",
    "privacyUrl": "https://your-railway-app.up.railway.app/privacy",
    "termsOfUseUrl": "https://your-railway-app.up.railway.app/terms"
  },
  "icons": {
    "color": "icon-color.png",
    "outline": "icon-outline.png"
  },
  "name": {
    "short": "Bug Tracker Bot",
    "full": "Bug Tracker Bot - Automatic Bug Reporting"
  },
  "description": {
    "short": "Creates bug tickets from Teams messages",
    "full": "Automatically creates bug tickets when daniel.gajdos@gmail.com is mentioned in Teams messages"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "YOUR_BOT_APP_ID",
      "scopes": [
        "personal",
        "team",
        "groupchat"
      ],
      "supportsFiles": true,
      "isNotificationOnly": false
    }
  ],
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": [
    "your-railway-app.up.railway.app"
  ]
}
```

## Step 7: Environment Variables

Add these environment variables to your Railway deployment:

```env
# Teams Bot Configuration
TEAMS_APP_ID=your-bot-application-id
TEAMS_APP_PASSWORD=your-bot-client-secret
TEAMS_CLIENT_ID=your-azure-app-id
TEAMS_CLIENT_SECRET=your-azure-client-secret
TEAMS_TENANT_ID=your-tenant-id-or-common
```

## Step 8: Deploy and Test

1. Deploy your updated application to Railway
2. In Teams, go to **Apps** > **Upload a custom app**
3. Upload your Teams app package (zip file with manifest.json and icons)
4. Add the bot to your team or chat with Marian
5. Test by mentioning `daniel.gajdos@gmail.com` in a message

## Usage

Once set up, the bot will:

1. **Monitor Teams messages** for mentions of `daniel.gajdos@gmail.com`
2. **Extract bug information** from the message text
3. **Download screenshots** attached to the message
4. **Create bug tickets** automatically in your bug tracker
5. **Send confirmation** back to Teams with the bug ID

### Message Format Examples

```
Bug: Login button not working daniel.gajdos@gmail.com
Priority: high
Steps to reproduce:
1. Go to login page
2. Click login button
3. Nothing happens
```

```
daniel.gajdos@gmail.com - Critical issue with payment processing
The payment form crashes when users try to submit
```

## Troubleshooting

### Bot not responding
- Check that the messaging endpoint is correct and accessible
- Verify environment variables are set correctly
- Check Railway logs for errors

### Permissions issues
- Ensure admin consent was granted for all Graph API permissions
- Verify the bot has been added to the team/chat

### Messages not being processed
- Confirm `daniel.gajdos@gmail.com` is mentioned in the message
- Check that the bot is active and not muted in the conversation

## Security Notes

- The bot only processes messages that mention the specific email address
- All API calls use secure authentication tokens
- Screenshots are downloaded and stored securely
- Only authorized users can access the bug tracker web interface

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Test the bot endpoint directly
4. Check Azure AD application permissions
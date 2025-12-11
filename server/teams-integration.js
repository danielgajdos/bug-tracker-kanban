const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TeamsIntegration {
  constructor(config) {
    this.config = config;
    this.targetEmail = 'daniel.gajdos@gmail.com';
    this.msalClient = null;
    this.graphClient = null;
    this.accessToken = null;
    
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Initialize MSAL client for app-only authentication
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`
        }
      });

      // Get access token using client credentials flow
      await this.getAccessToken();
      
      // Initialize Graph client
      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            if (!this.accessToken || this.isTokenExpired()) {
              await this.getAccessToken();
            }
            return this.accessToken;
          }
        }
      });

      console.log('Teams integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Teams integration:', error);
    }
  }

  async getAccessToken() {
    try {
      const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
      };

      const response = await this.msalClient.acquireTokenSilent(clientCredentialRequest);
      this.accessToken = response.accessToken;
      this.tokenExpiry = response.expiresOn;
    } catch (error) {
      // If silent acquisition fails, try to acquire token
      const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
      this.accessToken = response.accessToken;
      this.tokenExpiry = response.expiresOn;
    }
  }

  isTokenExpired() {
    return !this.tokenExpiry || new Date() >= this.tokenExpiry;
  }

  // Process incoming Teams message
  async processTeamsMessage(messageData) {
    try {
      const { text, from, attachments, channelId, teamId } = messageData;
      
      // Check if message mentions the target email
      if (!text || !text.includes(this.targetEmail)) {
        return null;
      }

      console.log('Processing Teams message with email mention:', text);

      // Extract bug information from the message
      const bugData = this.extractBugInfo(text);
      
      // Process any attachments (screenshots)
      const screenshots = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.contentType && attachment.contentType.startsWith('image/')) {
            const screenshot = await this.downloadTeamsAttachment(attachment);
            if (screenshot) {
              screenshots.push(screenshot);
            }
          }
        }
      }

      // Create bug ticket
      const bugTicket = {
        title: bugData.title || 'Bug reported from Teams',
        description: bugData.description || text,
        priority: bugData.priority || 'medium',
        reporter_name: from.user?.displayName || 'Teams User',
        reporter_email: from.user?.userPrincipalName || this.targetEmail,
        screenshots: screenshots,
        source: 'teams',
        teams_metadata: {
          channelId,
          teamId,
          messageId: messageData.id,
          timestamp: new Date().toISOString()
        }
      };

      return bugTicket;
    } catch (error) {
      console.error('Error processing Teams message:', error);
      return null;
    }
  }

  // Extract bug information from Teams message text
  extractBugInfo(text) {
    const bugInfo = {
      title: null,
      description: text,
      priority: 'medium'
    };

    // Try to extract title from common patterns
    const titlePatterns = [
      /(?:bug|issue|problem):\s*(.+?)(?:\n|$)/i,
      /title:\s*(.+?)(?:\n|$)/i,
      /^(.+?)(?:\n|$)/i // First line as title
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        bugInfo.title = match[1].trim();
        break;
      }
    }

    // Extract priority if mentioned
    const priorityMatch = text.match(/priority:\s*(low|medium|high|critical)/i);
    if (priorityMatch) {
      bugInfo.priority = priorityMatch[1].toLowerCase();
    }

    // Look for urgent/critical keywords
    if (/urgent|critical|blocker|asap/i.test(text)) {
      bugInfo.priority = 'critical';
    } else if (/high|important/i.test(text)) {
      bugInfo.priority = 'high';
    }

    return bugInfo;
  }

  // Download attachment from Teams
  async downloadTeamsAttachment(attachment) {
    try {
      if (!attachment.contentUrl) {
        return null;
      }

      const response = await axios.get(attachment.contentUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'stream'
      });

      // Generate unique filename
      const filename = `teams-${Date.now()}-${Math.round(Math.random() * 1E9)}.${this.getFileExtension(attachment.contentType)}`;
      const filepath = path.join('uploads', filename);

      // Save file
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/uploads/${filename}`));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading Teams attachment:', error);
      return null;
    }
  }

  getFileExtension(contentType) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    return extensions[contentType] || 'jpg';
  }

  // Set up Teams webhook subscription
  async setupTeamsWebhook(webhookUrl) {
    try {
      const subscription = {
        changeType: 'created',
        notificationUrl: webhookUrl,
        resource: '/teams/getAllMessages',
        expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        clientState: uuidv4()
      };

      const response = await this.graphClient
        .api('/subscriptions')
        .post(subscription);

      console.log('Teams webhook subscription created:', response.id);
      return response;
    } catch (error) {
      console.error('Error setting up Teams webhook:', error);
      throw error;
    }
  }

  // Validate webhook notification
  validateWebhookNotification(notification, clientState) {
    return notification.clientState === clientState;
  }
}

module.exports = TeamsIntegration;
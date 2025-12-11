const { ActivityHandler, MessageFactory, TeamsActivityHandler } = require('botbuilder');

class TeamsBugBot extends TeamsActivityHandler {
  constructor(teamsIntegration, bugCreationCallback) {
    super();
    this.teamsIntegration = teamsIntegration;
    this.createBug = bugCreationCallback;
    this.targetEmail = 'daniel.gajdos@gmail.com';

    // Handle when a message is sent to the bot
    this.onMessage(async (context, next) => {
      const text = context.activity.text;
      
      // Check if message mentions the target email
      if (text && text.includes(this.targetEmail)) {
        await this.handleBugReport(context);
      }
      
      await next();
    });

    // Handle when the bot is mentioned in a channel
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      const welcomeText = `Hello! I'm the Bug Tracker bot. Mention ${this.targetEmail} in your message to create a bug ticket automatically.`;
      
      for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
        if (membersAdded[cnt].id !== context.activity.recipient.id) {
          const welcomeMessage = MessageFactory.text(welcomeText);
          await context.sendActivity(welcomeMessage);
        }
      }
      
      await next();
    });
  }

  async handleBugReport(context) {
    try {
      const activity = context.activity;
      
      // Extract message data
      const messageData = {
        text: activity.text,
        from: activity.from,
        attachments: activity.attachments || [],
        channelId: activity.channelData?.channel?.id,
        teamId: activity.channelData?.team?.id,
        id: activity.id
      };

      // Process the message through Teams integration
      const bugTicket = await this.teamsIntegration.processTeamsMessage(messageData);
      
      if (bugTicket) {
        // Create the bug ticket
        const createdBug = await this.createBug(bugTicket);
        
        if (createdBug) {
          // Send confirmation message
          const confirmationMessage = MessageFactory.text(
            `✅ Bug ticket created successfully!\n\n` +
            `**Bug ID:** ${createdBug.bug_number || createdBug.id}\n` +
            `**Title:** ${createdBug.title}\n` +
            `**Priority:** ${createdBug.priority}\n\n` +
            `You can view and manage this bug in the [Bug Tracker](${process.env.CLIENT_URL || 'https://itwodevqa.up.railway.app'})`
          );
          
          await context.sendActivity(confirmationMessage);
        } else {
          await context.sendActivity(MessageFactory.text('❌ Failed to create bug ticket. Please try again.'));
        }
      }
    } catch (error) {
      console.error('Error handling bug report:', error);
      await context.sendActivity(MessageFactory.text('❌ An error occurred while processing your bug report.'));
    }
  }

  // Handle file uploads (screenshots)
  async handleTeamsFileUpload(context) {
    const attachments = context.activity.attachments;
    const screenshots = [];

    for (const attachment of attachments) {
      if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        try {
          const screenshot = await this.teamsIntegration.downloadTeamsAttachment(attachment);
          if (screenshot) {
            screenshots.push(screenshot);
          }
        } catch (error) {
          console.error('Error processing screenshot:', error);
        }
      }
    }

    return screenshots;
  }
}

module.exports = TeamsBugBot;
# Discord Self AI Bot

A Discord bot that uses the Hugging Face API to provide AI-powered responses with Meta's Llama 3 model.

## ⚠️ DISCLAIMER

**FOR EDUCATIONAL PURPOSES ONLY!**

This project uses self-bot functionality which violates Discord's Terms of Service. Using this code as-is could result in your Discord account being banned. I am not responsible for any bans or other consequences resulting from the use of this code. Use at your own risk.

## Features

- Responds to messages in specified Discord channels using Llama 3 AI
- Two operation modes:
  - **ON mode**: Responds to all messages (except replies to other users)
  - **OFF mode**: Only responds when tagged or replied to
- Admin-only commands to control bot behavior
- Support for multiple channels with either WebSocket gateway or polling methods
- Customizable response settings for the AI model

## How It Works

The bot uses two main components:

1. **discord-base.js**: Handles the Discord API connection, message listening, and channel polling
2. **discord-ai-bot.js**: Processes messages and integrates with the Hugging Face API to get AI responses

When a message is received in a monitored channel, the bot:
1. Decides whether to respond based on the current mode
2. Sends the message to the Llama 3 model via Hugging Face API
3. Cleans up and formats the AI's response
4. Replies to the original message with the AI's response

## Setup Instructions

### Prerequisites
- Node.js installed on your system
- A Discord account
- A Hugging Face API key

### Installation Steps

1. Clone this repository
```
git clone https://github.com/yourusername/discord-self-ai-bot.git
cd discord-self-ai-bot
```

2. Install dependencies
```
npm install
```

3. Configure the bot
   - Open `discord-base.js` and replace `'your discord auth token'` with your Discord account token
   - Open `discord-ai-bot.js` and replace:
     - `'your HUGGINGFACE API KEY'` with your Hugging Face API key
     - `'your admin account. make sure not same as bot AI account'` with your admin username
     - Update the `MONITORED_CHANNELS` array with your desired channel IDs

4. Start the bot
```
npm start
```

## Commands

The bot supports the following commands:

- **General Commands**
  - `!help` or `!commands` - Shows help information

- **Mode Commands**
  - `!botmode` - Check current bot mode
  - `!botmode on` - Set bot to respond to all messages (admin only)
  - `!botmode off` - Set bot to only respond when tagged or replied to (admin only)

- **Channel Management** (admin only)
  - `!listchannels` - List all monitored channels
  - `!addchannel [channelID]` - Add a channel to monitor (using gateway)
  - `!addchannel [channelID] poll` - Add a channel with polling enabled
  - `!removechannel [channelID]` - Remove a channel from monitoring

## Channel Monitoring Methods

The bot supports two methods for monitoring Discord channels:

1. **Gateway Method**: Uses Discord's WebSocket Gateway to receive real-time events
2. **Polling Method**: Periodically checks for new messages (useful for channels where you don't have gateway access)

## Security Considerations

- Your Discord token provides full access to your account. Never share it.
- Consider using a dedicated Discord account for running this bot.
- The bot stores recent message IDs to prevent processing duplicates.

## Customizing AI Responses

You can modify the AI response parameters in the `getHuggingFaceResponse` function:

```javascript
parameters: {
  max_new_tokens: 100,     // Controls response length
  temperature: 0.85,       // Higher = more random responses
  top_p: 0.92,             // Controls diversity
  top_k: 40,               // Controls token selection
  repetition_penalty: 1.1, // Discourages repetition
  do_sample: true,         // Enables sampling
  return_full_text: false  // Only return model's response
}
```

## Troubleshooting

- If the bot doesn't respond, check your Discord token and Hugging Face API key
- Review the console logs for error messages
- Ensure you've correctly set up the channel IDs
- Check if you have the necessary permissions in the channels

## License

This project is licensed under the ISC License.
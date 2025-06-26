# Discord Self AI Bot

[![License](https://img.shields.io/github/license/yfbsei/discord-self-AI-bot)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-12%2B-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](https://github.com/yfbsei/discord-self-AI-bot/pulls)
[![Issues](https://img.shields.io/github/issues/yfbsei/discord-self-AI-bot)](https://github.com/yfbsei/discord-self-AI-bot/issues)
[![Stars](https://img.shields.io/github/stars/yfbsei/discord-self-AI-bot?style=social)](https://github.com/yfbsei/discord-self-AI-bot/stargazers)

---

> **An AI-powered Discord self-bot** powered by Meta's LLaMA 3.1 Instruct 8B model via Hugging Face API. Responds like a human, supports multi-channel chat automation, and gives you flexible message control — all from your own account.

---

### 🔍 Keywords / SEO Tags (for discoverability):
> `discord-selfbot`, `discord ai bot`, `llama 3 bot`, `huggingface`, `llama3 chatbot`, `nodejs bot`, `websocket`, `polling`, `selfbot ai`, `discord automation`, `llama3.1`, `discord chatbot`, `ai assistant`

---

## ⚠️ DISCLAIMER

**FOR EDUCATIONAL PURPOSES ONLY!**

This project uses self-bot functionality which violates Discord's Terms of Service. Using this code as-is could result in your Discord account being banned. I am not responsible for any bans or other consequences resulting from the use of this code. Use at your own risk.

## Features

- **AI-Powered Conversations**: Responds using Meta's Llama 3.1 8B Instruct model with natural, casual conversation style
- **Flexible Response Modes**:
  - **ON mode**: Responds to all messages (except replies to other users)
  - **OFF mode**: Only responds when tagged or replied to
- **Admin Controls**: Command-based bot management with admin-only privileges
- **Multi-Channel Support**: Monitor multiple channels with either WebSocket gateway or polling methods
- **Environment-Based Configuration**: Secure configuration using `.env` files
- **Duplicate Prevention**: Smart message filtering to prevent loops and duplicate responses
- **Context-Aware Responses**: Understands mentions, replies, and message context

## How It Works

The bot consists of two main components:

1. **discord-base.js**: Handles Discord API connections, WebSocket gateway, message polling, and core Discord functionality
2. **discord-ai-bot.js**: Processes messages, integrates with Hugging Face API, and manages bot logic

### Message Processing Flow

When a message is received in a monitored channel, the bot:
1. **Filters Messages**: Checks if the message should be processed based on current mode and context
2. **Context Analysis**: Determines if it's a mention, reply, or general message
3. **AI Processing**: Sends the message to Llama 3.1 model via Hugging Face API with optimized prompts
4. **Response Cleaning**: Formats the AI response to sound natural and conversational
5. **Reply Generation**: Sends the processed response as a reply to the original message

## Setup Instructions

### Prerequisites
- Node.js (version 12 or higher)
- A Discord account
- A Hugging Face API key (free tier available)

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/yfbsei/discord-self-AI-bot.git
cd discord-self-ai-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
   - Copy the `.env template` file to `.env`
   - Fill in your configuration:

```bash
# Discord Bot Configuration - REQUIRED
USER_TOKEN="your_discord_user_token_here"

# Hugging Face API Configuration - REQUIRED  
HUGGINGFACE_API_KEY="your_huggingface_api_key_here"

# Admin Configuration - REQUIRED
ADMIN_USERNAME="your_discord_username"

# Channel Configuration - REQUIRED (JSON format)
MONITORED_CHANNELS=[{"id":"CHANNEL_ID_1","usePolling":false,"pollInterval":5000},{"id":"CHANNEL_ID_2","usePolling":true,"pollInterval":3000}]
```

4. **Getting Required Information**
   - **Discord Token**: Use browser developer tools to extract your user token (see security warnings below)
   - **Hugging Face API Key**: Sign up at [huggingface.co](https://huggingface.co) and generate an API key
   - **Channel IDs**: Enable Discord Developer Mode and right-click channels to copy IDs
   - **Username**: Your exact Discord username (case-sensitive)

5. **Start the bot**
```bash
npm start
```

## Commands Reference

### General Commands (Available to All Users)
- `!help` or `!commands` - Display comprehensive help information
- `!botmode` - Check current response mode

### Admin-Only Commands

#### Mode Management
- `!botmode on` - Enable response to all messages mode
- `!botmode off` - Enable mention/reply-only mode

#### Channel Management
- `!listchannels` - Display all monitored channels with their settings
- `!addchannel [channelID]` - Add channel with gateway monitoring
- `!addchannel [channelID] poll` - Add channel with polling monitoring
- `!removechannel [channelID]` - Remove channel from monitoring

### Command Examples
```
!help                           # Show help
!botmode                        # Check current mode
!botmode on                     # Set to respond to all messages
!addchannel 123456789012345678  # Add channel with gateway
!addchannel 123456789012345678 poll  # Add channel with polling
!removechannel 123456789012345678    # Remove channel
```

## Channel Monitoring Methods

### Gateway Method (Recommended)
- **Real-time**: Uses Discord's WebSocket Gateway for instant message detection
- **Efficient**: Lower resource usage and faster response times
- **Limitations**: May not work in all server configurations

### Polling Method
- **Reliable**: Periodically checks for new messages (default: every 3-5 seconds)
- **Universal**: Works in channels where gateway access is limited
- **Configurable**: Adjustable polling intervals per channel

## Configuration Details

### Response Mode Behavior

**ON Mode (Default)**:
- Responds to all direct messages in monitored channels
- Responds to replies directed at the bot
- Ignores replies to other users to prevent conversation interference

**OFF Mode**:
- Only responds when explicitly mentioned (@username)
- Only responds to direct replies to the bot's messages
- Minimal interference with normal chat flow

### AI Response Customization

The bot uses optimized parameters for natural conversation in `getHuggingFaceResponse()`:

```javascript
parameters: {
  max_new_tokens: 50,          // Short, conversational responses
  temperature: 0.8,            // Natural variability
  top_p: 0.9,                  // Balanced diversity
  do_sample: true,             // Enable sampling
  return_full_text: false,     // Only new generation
  stop: ["<|eot_id|>", "<|end_of_text|>", "\n\n"] // Natural stopping
}
```

## Security Considerations

### Critical Security Notes
- **Discord Token**: Provides full access to your Discord account - never share it
- **Account Safety**: Consider using a dedicated Discord account for bot operations
- **API Keys**: Keep your Hugging Face API key secure and don't commit it to version control
- **Environment Files**: The `.env` file is automatically ignored by git for security

### Best Practices
- Use environment variables for all sensitive configuration
- Regularly rotate API keys
- Monitor bot activity for unexpected behavior
- Keep dependencies updated for security patches

## Troubleshooting

### Common Issues

**Bot doesn't respond**:
- Verify Discord token is valid and properly formatted
- Check Hugging Face API key and account status
- Ensure channel IDs are correct and bot has access
- Review console logs for error messages

**Permission errors**:
- Confirm bot account has necessary permissions in target channels
- Check if the account is banned or restricted
- Verify admin username matches exactly (case-sensitive)

**API rate limiting**:
- Hugging Face free tier has rate limits
- Consider upgrading to paid tier for higher usage
- Implement additional delays if needed

**Connection issues**:
- Check internet connectivity
- Verify Discord API status
- Review WebSocket connection logs

### Debug Mode
Enable detailed logging by monitoring the console output, which includes:
- Message processing decisions
- API request/response details
- Error messages and stack traces
- Channel monitoring status

## Technical Architecture

### Dependencies
- **node-fetch**: HTTP requests to Discord and Hugging Face APIs
- **ws**: WebSocket connections for Discord Gateway
- **dotenv**: Environment variable management

### File Structure
```
discord-self-ai-bot/
├── discord-ai-bot.js      # Main bot logic and AI integration
├── discord-base.js        # Discord API wrapper and connection handling
├── package.json           # Project dependencies and scripts
├── .env                   # Environment configuration (create from template)
├── .env template          # Configuration template
├── .gitignore            # Git ignore rules (includes .env)
└── README.md             # This documentation
```

## Contributing

This project is for educational purposes. If you'd like to contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License. See the package.json file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review console logs for error details
3. Ensure all environment variables are properly configured
4. Verify Discord and Hugging Face API status

Remember: This is an educational project that violates Discord's ToS. Use responsibly and at your own risk.

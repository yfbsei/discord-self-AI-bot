# Discord Self AI Bot

[![License](https://img.shields.io/github/license/yfbsei/discord-self-AI-bot)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-12%2B-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](https://github.com/yfbsei/discord-self-AI-bot/pulls)
[![Issues](https://img.shields.io/github/issues/yfbsei/discord-self-AI-bot)](https://github.com/yfbsei/discord-self-AI-bot/issues)
[![Stars](https://img.shields.io/github/stars/yfbsei/discord-self-AI-bot?style=social)](https://github.com/yfbsei/discord-self-AI-bot/stargazers)

---

> **An advanced AI-powered Discord self-bot** featuring a hybrid monitoring system with Meta's LLaMA 3.1 Instruct 8B model via Hugging Face API. Delivers fast, reliable responses with smart fallback mechanisms and flexible message control.

---

## ⚠️ DISCLAIMER

**FOR EDUCATIONAL PURPOSES ONLY!**

This project uses self-bot functionality which violates Discord's Terms of Service. Using this code could result in your Discord account being banned. I am not responsible for any bans or other consequences resulting from the use of this code. Use at your own risk.

## 🚀 Features

- **🤖 AI-Powered Conversations**: Meta's Llama 3.1 8B Instruct model with natural, casual conversation style
- **⚡ Hybrid Monitoring System**: Combines WebSocket Gateway (instant) + REST API Polling (reliable)
- **🎛️ Flexible Response Modes**:
  - **ON mode**: Responds to all messages (except replies to other users)
  - **OFF mode**: Only responds when tagged or replied to
- **👨‍💼 Admin Controls**: Command-based bot management with admin-only privileges
- **📡 Multi-Channel Support**: Monitor multiple channels with automatic system selection
- **🔒 Environment-Based Configuration**: Secure configuration using `.env` files
- **🛡️ Duplicate Prevention**: Smart message filtering to prevent loops
- **🧠 Context-Aware Responses**: Understands mentions, replies, and message context
- **🔄 Smart Fallbacks**: Continues working even when AI API has issues

## 🏗️ Architecture Overview

### Hybrid Monitoring System

The bot uses a sophisticated **dual-detection system** that combines the best of both worlds:

```
Discord Message Sent
        ↓
   ┌─────────────────┐
   │   BOTH SYSTEMS  │
   │  DETECT MESSAGE │ 
   └─────────────────┘
        ↓
   ┌─────────────────┐
   │    GATEWAY      │ ──── Has content? ──→ ✅ Process immediately (0ms)
   │  (WebSocket)    │ ──── Empty content? ──→ ❌ Skip, let polling handle
   │    Instant      │
   └─────────────────┘
        ↓
   ┌─────────────────┐
   │    POLLING      │ ──── Always gets ──→ ✅ Process (800ms max delay)
   │  (REST API)     │      full content
   │   Reliable      │
   └─────────────────┘
        ↓
   ┌─────────────────┐
   │  DEDUPLICATION  │ ──── Prevents ────→ ✅ Single response per message
   │    SYSTEM       │      double replies
   └─────────────────┘
        ↓
   ┌─────────────────┐
   │   AI RESPONSE   │ ──── Llama 3.1 ───→ ✅ Natural conversation
   │   GENERATION    │      with fallbacks
   └─────────────────┘
```

### System Components

**🔧 discord-base.js**: Core Discord connectivity
- WebSocket Gateway management
- REST API polling system
- Message deduplication
- User authentication

**🤖 discord-ai-bot.js**: AI integration and logic
- Hugging Face API integration
- Message processing logic
- Command system
- Response mode management

## ⚡ Quick Start

Get your bot running in under 5 minutes:

### 1. **Clone & Install**
```bash
git clone https://github.com/yfbsei/discord-self-AI-bot.git
cd discord-self-ai-bot
npm install
```

### 2. **Get Your Discord Token**
- Open Discord in browser → F12 → Network tab
- Send any message → Find "messages" request → Copy Authorization header

### 3. **Get Hugging Face API Key**
- Visit [huggingface.co](https://huggingface.co) → Sign up → Settings → Access Tokens → Create new token

### 4. **Create .env File**
```bash
USER_TOKEN="your_discord_token_here"
HUGGINGFACE_API_KEY="your_huggingface_key_here"
ADMIN_USERNAME="your_discord_username"
MONITORED_CHANNELS=["your_channel_id_here"]
```

### 5. **Start Bot**
```bash
npm start
```

**✅ Done!** Your bot should now respond to messages in your monitored channels.

## 📋 Prerequisites

- **Node.js** (version 12 or higher)
- **Discord account** (dedicated account recommended)
- **Hugging Face API key** (free tier available)

## 🎮 Commands Reference

### General Commands (All Users)
- `!help` or `!commands` - Display comprehensive help
- `!botmode` - Check current response mode

### Admin Commands (Admin Only)

#### Mode Management
- `!botmode on` - Enable response to all messages mode
- `!botmode off` - Enable mention/reply-only mode

#### Usage Examples
```bash
!help                    # Show help
!botmode                 # Check current mode
!botmode on             # Set to respond to all messages
!botmode off            # Set to mention/reply only mode
```

## ⚙️ Configuration

### Response Mode Behavior

**🟢 ON Mode (Default):**
- Responds to all direct messages in monitored channels
- Responds to replies directed at the bot
- Ignores replies to other users to prevent conversation interference

**🔴 OFF Mode:**
- Only responds when explicitly mentioned (@username)
- Only responds to direct replies to the bot's messages
- Minimal interference with normal chat flow

### Multi-Channel Configuration

**Single Channel:**
```bash
MONITORED_CHANNELS=["1234567890123456789"]
```

**Multiple Channels:**
```bash
MONITORED_CHANNELS=["1234567890123456789", "9876543210987654321", "1111222233334444555"]
```

## 🔧 AI Response Customization

The bot uses optimized parameters for natural conversation:

```javascript
parameters: {
  max_new_tokens: 40,          // Short, conversational responses
  temperature: 0.8,            // Natural variability
  top_p: 0.9,                  // Balanced diversity
  do_sample: true,             // Enable sampling
  return_full_text: false,     // Only new generation
  stop: ["<|eot_id|>", "<|end_of_text|>", "\n\n"] // Natural stopping
}
```

## 🔒 Security Considerations

### Critical Security Notes
- **🚨 Discord Token**: Provides full access to your Discord account - never share it
- **🛡️ Account Safety**: Consider using a dedicated Discord account for bot operations
- **🔐 API Keys**: Keep your Hugging Face API key secure and don't commit to version control
- **📁 Environment Files**: The `.env` file is automatically ignored by git for security

### Best Practices
- Use environment variables for all sensitive configuration
- Regularly rotate API keys
- Monitor bot activity for unexpected behavior
- Keep dependencies updated for security patches

## 🐛 Troubleshooting

### Common Issues

**Bot doesn't respond:**
- ✅ Verify Discord token is valid and properly formatted
- ✅ Check Hugging Face API key and account status
- ✅ Ensure channel IDs are correct and bot has access
- ✅ Review console logs for error messages

**API rate limiting (HTTP 402):**
- 📊 Hugging Face free tier has daily/hourly limits
- 💰 Consider upgrading to paid tier for higher usage
- ⏰ Bot will automatically use fallback responses until quota resets

**Connection issues:**
- 🌐 Check internet connectivity
- 📊 Verify Discord API status
- 🔄 Review WebSocket connection logs in console

**Empty message content:**
- ✅ This is normal for user tokens with Gateway
- ✅ Polling system automatically handles these cases
- ✅ No action needed - hybrid system working as designed

### Debug Information

Enable detailed logging by monitoring console output:
- Message processing decisions
- API request/response details  
- Error messages and stack traces
- Channel monitoring status
- System performance metrics

## 📊 Performance Metrics

### Response Times
- **Gateway (when working)**: ~50ms (instant)
- **Polling fallback**: ~800ms (near real-time)
- **Combined system**: Average 200-400ms response time

### Resource Usage
- **Memory**: ~50-100MB typical usage
- **CPU**: Minimal (mostly idle)
- **Network**: ~1-5KB/minute per channel

## 🤝 Contributing

This project is for educational purposes. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Ensure security best practices
5. Submit a pull request with detailed description

## 📄 License

This project is licensed under the ISC License. See the package.json file for details.

## 🆘 Support

For issues and questions:

1. **Check troubleshooting section** above
2. **Review console logs** for error details
3. **Verify environment configuration** is correct
4. **Check Discord and Hugging Face API status**
5. **Open an issue** with detailed logs and configuration (remove sensitive data)

### Common Error Codes
- **HTTP 402**: Hugging Face quota exceeded (temporary)
- **HTTP 403**: Discord API permission denied (token issue)
- **HTTP 429**: Rate limited (temporary)
- **Error 20002**: Bot-only endpoint accessed with user token (normal)

---

**Remember**: This is an educational project that violates Discord's ToS. Use responsibly and at your own risk.

## ⭐ Star History

If this project helped you, please consider giving it a star! ⭐

---

*Built with ❤️ for educational purposes*
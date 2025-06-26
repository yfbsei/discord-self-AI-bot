# Discord Self AI Bot

[![License](https://img.shields.io/github/license/yfbsei/discord-self-AI-bot)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-12%2B-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](https://github.com/yfbsei/discord-self-AI-bot/pulls)
[![Issues](https://img.shields.io/github/issues/yfbsei/discord-self-AI-bot)](https://github.com/yfbsei/discord-self-AI-bot/issues)
[![Stars](https://img.shields.io/github/stars/yfbsei/discord-self-AI-bot?style=social)](https://github.com/yfbsei/discord-self-AI-bot/stargazers)

---

> **An advanced AI-powered Discord self-bot** featuring a hybrid monitoring system with Meta's LLaMA 3.3 70B Instruct Turbo model via Together AI and Mistral Small 24B via OpenRouter as fallback. Delivers fast, reliable responses with smart fallback mechanisms and flexible message control.

---

## ⚠️ DISCLAIMER

**FOR EDUCATIONAL PURPOSES ONLY!**

This project uses self-bot functionality which violates Discord's Terms of Service. Using this code could result in your Discord account being banned. I am not responsible for any bans or other consequences resulting from the use of this code. Use at your own risk.

## 🚀 Features

- **🧠 Dual AI System**: Meta's Llama 3.3 70B Instruct Turbo (primary) + Mistral Small 24B (fallback)
- **⚡ Hybrid Monitoring System**: Combines WebSocket Gateway (instant) + REST API Polling (reliable)
- **🛡️ 99.9% Uptime**: Automatic failover between AI providers ensures continuous operation
- **🎛️ Flexible Response Modes**:
  - **ON mode**: Responds to all messages (except replies to other users)
  - **OFF mode**: Only responds when tagged or replied to
- **👨‍💼 Admin Controls**: Command-based bot management with admin-only privileges
- **📡 Multi-Channel Support**: Monitor multiple channels with automatic system selection
- **🔒 Environment-Based Configuration**: Secure configuration using `.env` files
- **🛡️ Duplicate Prevention**: Smart message filtering to prevent loops
- **🧠 Context-Aware Responses**: Understands mentions, replies, and message context
- **🔄 Triple-Layer Fallbacks**: Together AI → OpenRouter → Smart Static Responses
- **💰 Cost Effective**: Both AI providers offer generous free tiers

## 🆕 What's New - Dual AI Provider System

### Why Dual AI Providers?

- **🛡️ Maximum Uptime**: If one provider has issues, the other takes over instantly
- **🎯 Best Quality**: Always tries the premium 70B model first
- **💰 Cost Effective**: Both providers offer generous free tiers
- **⚡ Fast Failover**: Automatic switching in under 1 second
- **🧠 Quality Scaling**: 70B → 24B → Static responses as needed

### AI Provider Comparison

| Provider | Model | Size | Speed | Quality | Free Tier |
|----------|-------|------|--------|---------|-----------|
| **Together AI** | Llama 3.3 70B | 70B | Fast | Excellent | 6 req/min |
| **OpenRouter** | Mistral Small | 24B | Very Fast | Very Good | Generous |
| **Static** | Hardcoded | - | Instant | Basic | Unlimited |

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
   │   AI RESPONSE   │ ──── Dual AI ─────→ ✅ Natural conversation
   │   GENERATION    │      System
   └─────────────────┘
```

### Dual AI Fallback System

The bot features a **triple-layer fallback system** ensuring 99.9% uptime:

```
User Message
     ↓
┌─────────────────────────┐
│     Together AI         │ ──── Success? ──→ ✅ Response sent
│     (Primary)           │      (70B model)
│ Llama 3.3 70B Turbo     │
└─────────────────────────┘
     ↓ (If fails: 404, 429, 401, 500, timeout)
┌─────────────────────────┐
│     OpenRouter          │ ──── Success? ──→ ✅ Response sent  
│     (Fallback)          │      (24B model)
│ Mistral Small 24B       │
└─────────────────────────┘
     ↓ (If both fail: network issues, both down)
┌─────────────────────────┐
│  Smart Static Responses │ ──── Always ───→ ✅ Contextual response
│  (Emergency Backup)     │      works      (hardcoded but smart)
│ Context-aware replies   │
└─────────────────────────┘
```

**Fallback Triggers:**
- **HTTP 429**: Rate limit exceeded
- **HTTP 401/403**: Authentication issues  
- **HTTP 404**: Model not found
- **HTTP 500+**: Server errors
- **Network timeouts**: Connection issues
- **Invalid responses**: Malformed JSON

### System Components

**🔧 discord-base.js**: Core Discord connectivity
- WebSocket Gateway management
- REST API polling system
- Message deduplication
- User authentication

**🤖 discord-ai-bot.js**: AI integration and logic
- Together AI & OpenRouter integration
- Intelligent fallback system
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

### 3. **Get AI API Keys** (Both Free!)

**Together AI (Primary):**
- Visit [api.together.xyz](https://api.together.xyz) → Sign up (free) → Settings → API Keys → Create new key

**OpenRouter (Fallback):**
- Visit [openrouter.ai](https://openrouter.ai) → Sign up (free) → Settings → Keys → Create new key

### 4. **Create .env File**
```bash
USER_TOKEN="your_discord_token_here"
TOGETHER_API_KEY="your_together_api_key_here"
OPENROUTER_API_KEY="your_openrouter_api_key_here"
ADMIN_USERNAME="your_discord_username"
MONITORED_CHANNELS=["your_channel_id_here"]
```

### 5. **Start Bot**
```bash
npm start
```

**✅ Done!** Your bot should now respond to messages with the power of dual AI providers and 99.9% uptime!

## 📋 Prerequisites

- **Node.js** (version 12 or higher)
- **Discord account** (dedicated account recommended)
- **Together AI API key** (free tier with 6 requests/minute)
- **OpenRouter API key** (free tier with generous limits)

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

The bot uses a **dual AI provider system** with optimized parameters for natural conversation. Both providers use identical settings to ensure consistent response quality.

### Primary AI Provider (Together AI)

```javascript
const response = await fetch(TOGETHER_API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOGETHER_API_KEY}`
  },
  body: JSON.stringify({
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    messages: [
      {
        role: "system",
        content: "You are a casual, friendly person on Discord. Keep responses very short (1-2 sentences max), natural, and conversational. Be helpful but brief. No formal explanations or AI-speak. Respond like a real person would in a chat."
      },
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 60,              // Short, conversational responses
    temperature: 0.8,            // Natural variability
    top_p: 0.9,                  // Balanced diversity
    stop: ["\n\n", "User:", "Assistant:"] // Natural stopping
  })
});
```

### Fallback AI Provider (OpenRouter)

```javascript
const response = await fetch(OPENROUTER_API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://github.com/yfbsei/discord-self-AI-bot",
    "X-Title": "Discord Self AI Bot"
  },
  body: JSON.stringify({
    model: "mistralai/mistral-small",
    messages: [
      {
        role: "system", 
        content: "You are a casual, friendly person on Discord. Keep responses very short (1-2 sentences max), natural, and conversational. Be helpful but brief. No formal explanations or AI-speak. Respond like a real person would in a chat."
      },
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 60,              // Short, conversational responses
    temperature: 0.8,            // Natural variability
    top_p: 0.9                   // Balanced diversity
    // Note: OpenRouter doesn't support custom stop sequences for this model
  })
});
```

### Configuration Differences

| Setting | Together AI | OpenRouter | Notes |
|---------|-------------|------------|-------|
| **Model** | Llama 3.3 70B Turbo | Mistral Small 24B | Primary vs Fallback |
| **Headers** | Standard auth | Includes referer & title | OpenRouter requirements |
| **Stop sequences** | Custom stop words | Not supported | Model limitation |
| **Max tokens** | 60 | 60 | Identical for consistency |
| **Temperature** | 0.8 | 0.8 | Identical for consistency |
| **Top-p** | 0.9 | 0.9 | Identical for consistency |

### Customization Options

You can modify the AI behavior by adjusting these parameters in `discord-ai-bot.js`:

**Response Length:**
```javascript
max_tokens: 60,    // Increase for longer responses (up to 100 recommended)
```

**Response Creativity:**
```javascript
temperature: 0.8,  // Lower = more focused (0.1-0.3), Higher = more creative (0.8-1.2)
```

**Response Diversity:**
```javascript
top_p: 0.9,        // Lower = more focused (0.1-0.5), Higher = more diverse (0.8-1.0)
```

**System Prompt:**
Modify the `content` field in the system message to change the bot's personality:
```javascript
content: "You are a [personality]. Keep responses [style]. [Additional instructions]."
```

### Example Customizations

**More Professional Bot:**
```javascript
content: "You are a helpful, professional assistant. Keep responses concise and informative. Use proper grammar and avoid slang."
```

**Casual Gaming Bot:**
```javascript
content: "You are a chill gamer buddy. Use gaming slang, be enthusiastic about games, keep it short and fun."
```

**Technical Support Bot:**
```javascript
content: "You are a technical support specialist. Provide clear, step-by-step help. Be patient and thorough but concise."
```

## 🔒 Security Considerations

### Critical Security Notes
- **🚨 Discord Token**: Provides full access to your Discord account - never share it
- **🛡️ Account Safety**: Consider using a dedicated Discord account for bot operations
- **🔐 API Keys**: Keep both Together AI and OpenRouter API keys secure and don't commit to version control
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
- ✅ Check both Together AI and OpenRouter API keys and account status
- ✅ Ensure channel IDs are correct and bot has access
- ✅ Review console logs for error messages

**API rate limiting:**
- 📊 Together AI: 6 requests/minute on free tier
- 📊 OpenRouter: More generous free tier limits
- 🔄 Bot automatically switches between providers
- ⏰ Bot will use smart static responses if both providers are rate limited

**Fallback not working:**
- ✅ Verify OpenRouter API key is valid
- ✅ Check console logs for fallback attempts
- ✅ Test by temporarily breaking Together AI key
- ✅ Ensure both API keys are properly set in .env file

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
- **Together AI API**: ~100-300ms response time  
- **OpenRouter API**: ~50-200ms response time (often faster)
- **Automatic failover**: <1 second switch time

### Resource Usage
- **Memory**: ~50-100MB typical usage
- **CPU**: Minimal (mostly idle)
- **Network**: ~1-5KB/minute per channel

### Dual AI System Advantages
- **Uptime**: 99.9% availability with dual providers
- **Quality**: 70B model primary, 24B model fallback
- **Speed**: Fast APIs with automatic load balancing
- **Reliability**: Triple-layer fallback system
- **Cost**: Both providers offer generous free tiers

## 🆕 Migration from Single Provider

If you're upgrading from a single AI provider version:

1. **Update your .env file**: Add `TOGETHER_API_KEY="your_key_here"` and `OPENROUTER_API_KEY="your_key_here"`
2. **Get API keys**: Sign up at [api.together.xyz](https://api.together.xyz) and [openrouter.ai](https://openrouter.ai)
3. **Replace the bot file**: Use the new `discord-ai-bot.js` with dual provider support
4. **Remove old keys**: Remove `HUGGINGFACE_API_KEY` from your .env file
5. **Restart the bot**: `npm start`

**Benefits you'll notice:**
- Much better uptime and reliability
- Faster response times with load balancing
- Automatic failover during outages
- No more silent failures when APIs are down
- Higher quality responses from 70B model

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
4. **Check Discord, Together AI, and OpenRouter API status**
5. **Open an issue** with detailed logs and configuration (remove sensitive data)

### Common Error Codes
- **HTTP 429**: Rate limit exceeded (auto-switches to fallback)
- **HTTP 401/403**: API key issues (check both providers)
- **HTTP 404**: Model not found (verify model names)
- **HTTP 500+**: Server errors (automatic fallback)
- **Error 20002**: Bot-only endpoint accessed with user token (normal)

---

**Remember**: This is an educational project that violates Discord's ToS. Use responsibly and at your own risk.

## ⭐ Star History

If this project helped you, please consider giving it a star! ⭐

---

*Built with ❤️ for educational purposes - Now powered by Llama 3.3 70B Turbo!*
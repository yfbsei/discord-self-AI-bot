# Discord Self AI Bot

[![License](https://img.shields.io/github/license/yfbsei/discord-self-AI-bot)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-12%2B-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](https://github.com/yfbsei/discord-self-AI-bot/pulls)
[![Issues](https://img.shields.io/github/issues/yfbsei/discord-self-AI-bot)](https://github.com/yfbsei/discord-self-AI-bot/issues)
[![Stars](https://img.shields.io/github/stars/yfbsei/discord-self-AI-bot?style=social)](https://github.com/yfbsei/discord-self-AI-bot/stargazers)

---

> **An advanced AI-powered Discord self-bot** featuring conversation memory, hybrid monitoring system, and dual AI providers (Meta's LLaMA 3.3 70B + DeepSeek R1). Delivers natural, context-aware responses with 99.9% uptime and smart 1:1 message ratios.

---

## ⚠️ DISCLAIMER

**FOR EDUCATIONAL PURPOSES ONLY!**

This project uses self-bot functionality which violates Discord's Terms of Service. Using this code could result in your Discord account being banned. I am not responsible for any bans or other consequences resulting from the use of this code. Use at your own risk.

## 🚀 Key Features

### 🧠 **Advanced AI System**
- **Primary**: Meta's Llama 3.3 70B Instruct Turbo (Together AI)
- **Fallback**: DeepSeek R1 8B (OpenRouter) 
- **Emergency**: Smart static responses with context awareness
- **Triple-layer failover** ensures 99.9% uptime

### 💾 **Conversation Memory**
- **Per-channel memory** - remembers context across conversations
- **8-message history** per channel (4 complete exchanges)
- **Name recognition** - remembers when you tell it your name
- **Context awareness** - references previous discussions naturally

### ⚡ **Hybrid Monitoring System** 
- **WebSocket Gateway**: Instant responses (0ms delay) for mentions/replies
- **REST API Polling**: Reliable message capture (800ms max delay)
- **Automatic deduplication** prevents double responses
- **Smart message filtering** based on content and context

### 📱 **Optimized Discord Integration**
- **1:1 message ratio** - one user message = one bot response
- **Single message preference** - avoids message splitting when possible
- **Smart length handling** - only splits when absolutely necessary (>1990 chars)
- **Enhanced debugging** - detailed logs for troubleshooting

### 🎛️ **Flexible Response Modes**
- **ON mode**: Responds to all messages (except replies to other users)
- **OFF mode**: Only responds when tagged or replied to
- **Admin controls**: Command-based bot management

## 🆕 What's New in v2.0

### 🧠 **Conversation Memory System**
- **Persistent context** across messages in each channel
- **Natural conversations** that reference previous exchanges  
- **User recognition** - remembers names and preferences
- **Smart history management** with automatic cleanup

### 📏 **Optimized Response Length**
- **600 token limit** for concise, focused responses
- **Single message priority** - avoids unnecessary splitting
- **1:1 response ratio** for clean conversations
- **Smart truncation** only when absolutely needed

### 🔍 **Enhanced Debugging**
- **Full response logging** to see exactly what AI generates
- **Finish reason tracking** to detect API truncation
- **Character count monitoring** at multiple stages
- **Response structure validation** for better error handling

### 🛡️ **Improved Reliability**
- **Removed problematic stop sequences** that caused truncation
- **Better error handling** with detailed logging
- **Smart static fallbacks** with context awareness
- **Enhanced API response validation**

## 🏗️ Architecture Overview

### Dual AI Provider System

```
User Message
     ↓
┌─────────────────────────┐
│     Together AI         │ ──── Success? ──→ ✅ Response sent
│     (Primary)           │      (70B model)
│ Llama 3.3 70B Turbo     │
└─────────────────────────┘
     ↓ (If fails)
┌─────────────────────────┐
│     OpenRouter          │ ──── Success? ──→ ✅ Response sent  
│     (Fallback)          │      (8B model)
│ DeepSeek R1 8B          │
└─────────────────────────┘
     ↓ (If both fail)
┌─────────────────────────┐
│  Smart Static Responses │ ──── Always ───→ ✅ Contextual response
│  (Emergency Backup)     │      works      
│ Context-aware replies   │
└─────────────────────────┘
```

### Conversation Memory Flow

```
User: "help with fibonacci"
Bot: [stores: user:hayat, topic:fibonacci] → Response with code

User: "can you explain it more?"
Bot: [recalls: previous fibonacci discussion] → "Sure! The fibonacci function I showed..."

User: "my name is hayat"  
Bot: [stores: user_name:hayat] → "Nice to meet you, Hayat!"

User: "what did we discuss?"
Bot: [recalls: fibonacci, user_name] → "We discussed the fibonacci function, Hayat..."
```

### Hybrid Monitoring System

```
Discord Message Sent
        ↓
   ┌─────────────────┐
   │    GATEWAY      │ ──── Instant (0ms) ──→ ✅ Mentions & Replies
   │  (WebSocket)    │ 
   │    Real-time    │
   └─────────────────┘
        +
   ┌─────────────────┐
   │    POLLING      │ ──── Reliable (800ms) ──→ ✅ All Messages  
   │  (REST API)     │      
   │   Complete      │
   └─────────────────┘
        ↓
   ┌─────────────────┐
   │  DEDUPLICATION  │ ──── Prevents ────→ ✅ Single response per message
   │    SYSTEM       │      double replies
   └─────────────────┘
```

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

**✅ Done!** Your bot should now respond with conversation memory and optimized message handling!

## 📋 Prerequisites

- **Node.js** (version 12 or higher)
- **Discord account** (dedicated account recommended)
- **Together AI API key** (free tier with generous limits)
- **OpenRouter API key** (free tier available)

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
!help                    # Show help with memory status
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
- Maintains conversation memory across all interactions

**🔴 OFF Mode:**
- Only responds when explicitly mentioned (@username)
- Only responds to direct replies to the bot's messages
- Still maintains conversation memory for when it does respond
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

**Note**: Each channel maintains its own separate conversation memory.

## 🔧 AI Response Customization

### Current Configuration

```javascript
// Together AI (Primary)
{
  model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
  max_tokens: 600,        // Optimized for single Discord messages
  temperature: 0.7,       // Balanced creativity
  top_p: 0.9             // Good diversity
}

// OpenRouter (Fallback)  
{
  model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
  max_tokens: 600,        // Same as primary for consistency
  temperature: 0.7,       // Identical settings
  top_p: 0.9             // Identical settings
}
```

### Conversation Memory Settings

```javascript
// Memory configuration
const MAX_HISTORY_MESSAGES = 8;     // 4 complete exchanges per channel
const CLEANUP_THRESHOLD = 200;      // Clean old processed message IDs
const MEMORY_CLEANUP_INTERVAL = 30; // Seconds between memory status logs
```

### Message Length Optimization

```javascript
// Discord optimization
const DISCORD_SAFE_LENGTH = 1990;   // High threshold for single messages
const TARGET_TOKEN_COUNT = 600;     // ~1200-1500 characters
const SPLIT_ONLY_IF_NECESSARY = true; // Prefer single messages
```

### Customization Options

**Response Length:**
```javascript
max_tokens: 600,    // Increase for longer responses (up to 800 max)
```

**Response Style:**
```javascript
temperature: 0.7,   // Lower = more focused (0.1-0.5), Higher = more creative (0.8-1.2)
```

**Memory Depth:**
```javascript
// In conversation history management
if (history.length > 8) { // Change 8 to desired history length
```

**System Prompt Customization:**
```javascript
content: "You are an [personality]. Keep responses concise and under 1800 characters. Remember previous messages and reference the user by name when appropriate."
```

## 💾 Conversation Memory Features

### How Memory Works

1. **Per-Channel Storage**: Each Discord channel maintains separate conversation history
2. **User Recognition**: Remembers usernames when mentioned or told
3. **Context Retention**: References previous discussions naturally  
4. **Smart Cleanup**: Automatically manages memory to prevent bloat
5. **Cross-Session**: Memory persists until bot restart

### Memory Examples

```
User: "My name is Sarah"
Bot: "Nice to meet you, Sarah! How can I help you today?"

User: "Help with JavaScript functions"
Bot: [Provides code example]

User: "Can you explain that function more?"
Bot: "Sure thing, Sarah! The JavaScript function I showed you earlier..."

User: "What did we talk about?"
Bot: "We discussed JavaScript functions, Sarah. I provided you with examples..."
```

### Memory Management

- **Automatic Cleanup**: Removes old messages to maintain performance
- **Channel Separation**: Conversations in different channels don't interfere
- **Restart Reset**: Memory clears on bot restart (by design for privacy)
- **No Persistent Storage**: Conversations aren't saved to disk

## 🔒 Security Considerations

### Critical Security Notes
- **🚨 Discord Token**: Provides full access to your Discord account - never share it
- **🛡️ Account Safety**: Consider using a dedicated Discord account for bot operations
- **🔐 API Keys**: Keep both Together AI and OpenRouter API keys secure
- **📁 Environment Files**: The `.env` file is automatically ignored by git for security
- **💾 Memory Privacy**: Conversation memory is only stored in RAM and clears on restart

### Best Practices
- Use environment variables for all sensitive configuration
- Regularly rotate API keys
- Monitor bot activity for unexpected behavior
- Keep dependencies updated for security patches
- Use dedicated Discord account to minimize risk

## 🐛 Troubleshooting

### Common Issues

**Bot doesn't respond:**
- ✅ Verify Discord token is valid and properly formatted
- ✅ Check both Together AI and OpenRouter API keys and account status
- ✅ Ensure channel IDs are correct and bot has access
- ✅ Review console logs for error messages

**Responses are cut off:**
- ✅ Check console logs for "finish_reason" 
- ✅ Look for character count in logs
- ✅ Verify API keys haven't hit rate limits
- ✅ Check if responses are being truncated by stop sequences

**Memory not working:**
- ✅ Verify conversation history is being created (check logs)
- ✅ Ensure channel IDs are consistent
- ✅ Check if memory was cleared by bot restart
- ✅ Look for "🧠 Adding to conversation history" messages in logs

**Multiple messages for one response:**
- ✅ Check response length in logs  
- ✅ Verify DISCORD_SAFE_LENGTH setting
- ✅ Look for "splitting into X parts" messages
- ✅ Consider reducing max_tokens if responses are too long

**API rate limiting:**
- 📊 Together AI: Generous free tier
- 📊 OpenRouter: Free tier available for DeepSeek model
- 🔄 Bot automatically switches between providers
- ⏰ Static responses available if both providers are limited

### Debug Information

Enable detailed logging by monitoring console output:
- `🧠` Memory operations (adding/retrieving conversation history)
- `📏` Response length tracking and character counts  
- `📊` API finish reasons and response validation
- `🔍` Full AI responses before sending to Discord
- `📤` Message sending decisions (single vs split)
- `⚡` Gateway vs polling message detection
- `💾` Memory status every 30 seconds

### Debug Example Output

```
🎯 Getting AI response for: "help with fibonacci" from hayat in channel 1387582680081895630
🧠 Adding to conversation history: user message in channel 1387582680081895630
🆕 Created new conversation history for channel 1387582680081895630
📚 Retrieved 1 messages from conversation history
🔄 Trying Together AI (Primary)...
📡 Together AI Response Status: 200
📏 Response length: 847 characters
🔍 Full AI response: "Here's a JavaScript function to check if a number is a Fibonacci number..."
📊 Finish reason: stop
✅ Together AI Success
📤 Sending single message: 847 chars
✅ Single message sent successfully
```

## 📊 Performance Metrics

### Response Times
- **Gateway (instant)**: ~0-50ms for mentions/replies
- **Polling (reliable)**: ~200-800ms for all messages  
- **Together AI API**: ~100-500ms response time
- **OpenRouter API**: ~50-300ms response time
- **Memory operations**: <1ms (in-memory)
- **Automatic failover**: <1 second switch time

### Resource Usage
- **Memory**: ~50-150MB (including conversation history)
- **CPU**: Minimal (mostly idle, spikes during AI calls)
- **Network**: ~1-10KB/minute per channel
- **Storage**: None (everything in memory)

### Conversation Memory Stats
- **Per-channel limit**: 8 messages (4 complete exchanges)
- **Memory cleanup**: Automatic when over limit
- **Cross-session**: Clears on restart
- **Performance impact**: Minimal (<1MB per active channel)

## 🤝 Contributing

This project is for educational purposes. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch  
3. Make your changes with proper testing
4. Ensure security best practices
5. Add appropriate logging and error handling
6. Update documentation if needed
7. Submit a pull request with detailed description

### Development Guidelines

- **Security first**: Never commit tokens or API keys
- **Logging**: Use appropriate emoji prefixes for log messages
- **Error handling**: Graceful degradation with helpful error messages
- **Memory management**: Clean up resources appropriately
- **Documentation**: Update README for any user-facing changes

## 📄 License

This project is licensed under the ISC License. See the package.json file for details.

## 🆘 Support

For issues and questions:

1. **Check troubleshooting section** above
2. **Review console logs** for error details and debug information
3. **Verify environment configuration** including all API keys
4. **Check API status**: Discord, Together AI, and OpenRouter
5. **Test with simple questions** to isolate issues
6. **Open an issue** with detailed logs and configuration (remove sensitive data)

### Common Error Codes
- **HTTP 429**: Rate limit exceeded (auto-switches to fallback)
- **HTTP 401/403**: API key issues (check both providers)
- **HTTP 404**: Model not found (verify model names)
- **HTTP 500+**: Server errors (automatic fallback)
- **Error 20002**: Bot-only endpoint accessed with user token (normal)
- **Memory errors**: Check conversation history logs

### Getting Help

For best support, include:
- Console log output with debug information
- Description of expected vs actual behavior  
- Steps to reproduce the issue
- Environment details (Node.js version, OS)
- Anonymized configuration (remove tokens/keys)

---

**Remember**: This is an educational project that violates Discord's ToS. Use responsibly and at your own risk.

## ⭐ Star History

If this project helped you, please consider giving it a star! ⭐

---

*Built with ❤️ for educational purposes - Now with conversation memory and optimized responses!*
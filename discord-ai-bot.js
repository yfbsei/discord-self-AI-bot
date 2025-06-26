// discord-ai-bot.js - Refactored with enhanced debugging and proper token limits
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { replyToMessage, startMonitoring } from './discord-base.js';

dotenv.config();

// Validate environment variables
const requiredVars = ['USER_TOKEN', 'TOGETHER_API_KEY', 'OPENROUTER_API_KEY', 'ADMIN_USERNAME', 'MONITORED_CHANNELS'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Create a .env file with these variables');
  process.exit(1);
}

// Configuration
let MONITORED_CHANNELS;
try {
  MONITORED_CHANNELS = JSON.parse(process.env.MONITORED_CHANNELS);
} catch (error) {
  console.error('❌ Invalid MONITORED_CHANNELS format. Expected: ["channel_id1", "channel_id2"]');
  process.exit(1);
}

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';
const FALLBACK_MODEL = 'deepseek/deepseek-r1-0528-qwen3-8b:free';

// Discord limits - increased to allow longer single messages
const DISCORD_MAX_MESSAGE_LENGTH = 2000;
const DISCORD_SAFE_LENGTH = 1990; // Much higher threshold

// Bot settings
let RESPOND_TO_ALL_MESSAGES = true;
const recentMessages = new Map();
const conversationHistory = new Map();

// Mode toggle function
function toggleMode(newMode, username) {
  if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    return `❌ Sorry, only ${ADMIN_USERNAME} can change bot mode.`;
  }

  if (newMode === 'on') {
    RESPOND_TO_ALL_MESSAGES = true;
    return "✅ Mode: ON - I'll respond to all messages (except replies to others)";
  } else if (newMode === 'off') {
    RESPOND_TO_ALL_MESSAGES = false;
    return "✅ Mode: OFF - I'll only respond when mentioned or replied to";
  } else {
    return `📊 Current mode: ${RESPOND_TO_ALL_MESSAGES ? 'ON' : 'OFF'}`;
  }
}

// Split long messages for Discord
function splitMessage(text, maxLength = DISCORD_SAFE_LENGTH) {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts = [];
  let currentPart = '';

  // Try to split by sentences first
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentPart + sentence).length <= maxLength) {
      currentPart += (currentPart ? ' ' : '') + sentence;
    } else {
      if (currentPart) {
        parts.push(currentPart);
        currentPart = sentence;
      } else {
        // Sentence is too long, split by words
        const words = sentence.split(' ');
        for (const word of words) {
          if ((currentPart + word).length <= maxLength) {
            currentPart += (currentPart ? ' ' : '') + word;
          } else {
            if (currentPart) {
              parts.push(currentPart);
              currentPart = word;
            } else {
              // Word is too long, force split
              parts.push(word.substring(0, maxLength));
              currentPart = word.substring(maxLength);
            }
          }
        }
      }
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

// Conversation history management
function addToConversationHistory(channelId, role, content, author = null) {
  const channelKey = String(channelId);
  console.log(`🧠 Adding to conversation history: ${role} message in channel ${channelKey}`);

  if (!conversationHistory.has(channelKey)) {
    conversationHistory.set(channelKey, []);
    console.log(`🆕 Created new conversation history for channel ${channelKey}`);
  }

  const history = conversationHistory.get(channelKey);
  const messageContent = author ? `${author}: ${content}` : content;

  history.push({
    role: role,
    content: messageContent
  });

  // Keep only last 8 messages (4 exchanges)
  if (history.length > 8) {
    const removed = history.splice(0, history.length - 8);
    console.log(`🗑️ Removed ${removed.length} old messages from history`);
  }

  console.log(`📝 Added ${role} message. Total messages in channel ${channelKey}: ${history.length}`);
  return history;
}

// Get conversation history for a channel
function getConversationHistory(channelId) {
  const channelKey = String(channelId);
  if (!conversationHistory.has(channelKey)) {
    console.log(`📭 No conversation history found for channel ${channelKey}`);
    return [];
  }

  const history = conversationHistory.get(channelKey);
  console.log(`📚 Retrieved ${history.length} messages from conversation history for channel ${channelKey}`);
  return history;
}

// Get AI response with enhanced debugging
async function getAIResponse(message, channelId, author) {
  console.log(`🎯 Getting AI response for: "${message}" from ${author} in channel ${channelId}`);

  // Add user message to conversation history
  addToConversationHistory(channelId, "user", message, author);

  // Get full conversation history
  const history = getConversationHistory(channelId);

  // Build messages for AI
  const messages = [
    {
      role: "system",
      content: "You are an experienced developer on Discord. When someone asks for code or technical help, provide complete, working solutions but keep them concise and focused. Aim for responses under 1800 characters to fit in a single Discord message. Be direct and comprehensive but not overly verbose. Remember previous messages in this conversation and reference the user by name when appropriate."
    },
    ...history
  ];

  console.log(`📤 Sending ${messages.length} messages to AI (1 system + ${history.length} conversation)`);

  // Try Together AI first
  try {
    console.log(`🔄 Trying Together AI (Primary)...`);

    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOGETHER_API_KEY}`
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages: messages,
        max_tokens: 600, // Reduced to fit in single Discord message
        temperature: 0.7,
        top_p: 0.9
        // Removed stop sequences - they were cutting off responses
      })
    });

    console.log(`📡 Together AI Response Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const aiText = data.choices[0].message.content.trim();
        console.log(`📏 Response length: ${aiText.length} characters`);
        console.log(`🔍 Full AI response: "${aiText}"`);
        console.log(`📊 Finish reason: ${data.choices[0].finish_reason || 'unknown'}`);

        // Add AI response to conversation history
        addToConversationHistory(channelId, "assistant", aiText);

        console.log(`✅ Together AI Success`);
        return aiText;
      } else {
        console.log(`❌ Together AI: Invalid response structure`);
        console.log(`🔍 Response data:`, JSON.stringify(data, null, 2));
      }
    } else {
      throw new Error(`Together AI API error: ${response.status}`);
    }

  } catch (error) {
    console.log(`❌ Together AI failed: ${error.message}`);
    console.log(`🔄 Trying OpenRouter fallback...`);
  }

  // Try OpenRouter fallback
  try {
    console.log(`🔄 Calling OpenRouter (Fallback)...`);

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/yfbsei/discord-self-AI-bot",
        "X-Title": "Discord Self AI Bot"
      },
      body: JSON.stringify({
        model: FALLBACK_MODEL,
        messages: messages,
        max_tokens: 600, // Reduced to fit in single Discord message
        temperature: 0.7,
        top_p: 0.9
      })
    });

    console.log(`📡 OpenRouter Response Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const aiText = data.choices[0].message.content.trim();
        console.log(`📏 Response length: ${aiText.length} characters`);
        console.log(`🔍 Full AI response: "${aiText}"`);
        console.log(`📊 Finish reason: ${data.choices[0].finish_reason || 'unknown'}`);

        // Add AI response to conversation history
        addToConversationHistory(channelId, "assistant", aiText);

        console.log(`✅ OpenRouter Success`);
        return aiText;
      } else {
        console.log(`❌ OpenRouter: Invalid response structure`);
        console.log(`🔍 Response data:`, JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ OpenRouter API error: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error("❌ OpenRouter failed:", error);
  }

  // Final fallback - enhanced static responses
  console.log("🆘 Both APIs failed, using enhanced static response");

  const lowerMessage = message.toLowerCase();
  let staticResponse = "";

  if (lowerMessage.includes('fibonacci')) {
    staticResponse = "Here's a basic Fibonacci checker:\n```javascript\nfunction isFibonacci(n) {\n  let a = 0, b = 1;\n  while (b < n) {\n    [a, b] = [b, a + b];\n  }\n  return b === n || n === 0;\n}\n```";
  } else if (lowerMessage.includes('tailwind') || lowerMessage.includes('css')) {
    staticResponse = "For Tailwind CSS on Ubuntu:\n```bash\nnpm install -D tailwindcss\nnpx tailwindcss init\n```\nThen add to your CSS:\n```css\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n```";
  } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    staticResponse = "hey there! how's it going?";
  } else if (lowerMessage.includes('?')) {
    staticResponse = "that's a good question! having some technical issues but I'll try to help.";
  } else {
    staticResponse = "sorry, having some technical issues right now. try again in a moment!";
  }

  // Add static response to history
  addToConversationHistory(channelId, "assistant", staticResponse);

  return staticResponse;
}

// Send message with Discord length handling - prefer single messages
async function sendAIResponse(channelId, messageId, aiResponse) {
  // Only split if absolutely necessary (over 1990 characters)
  if (aiResponse.length <= DISCORD_SAFE_LENGTH) {
    console.log(`📤 Sending single message: ${aiResponse.length} chars`);
    try {
      await replyToMessage(channelId, messageId, aiResponse);
      console.log(`✅ Single message sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send message:`, error);
    }
    return;
  }

  // Only split if absolutely necessary
  const messageParts = splitMessage(aiResponse);
  console.log(`⚠️ Message too long (${aiResponse.length} chars), splitting into ${messageParts.length} parts`);

  for (let i = 0; i < messageParts.length; i++) {
    const part = messageParts[i];
    const isLastPart = i === messageParts.length - 1;

    console.log(`📤 Sending part ${i + 1}/${messageParts.length}: ${part.length} chars`);

    try {
      await replyToMessage(channelId, messageId, part);
      console.log(`✅ Part ${i + 1} sent successfully`);

      // Add small delay between parts to avoid rate limiting
      if (!isLastPart) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Failed to send part ${i + 1}:`, error);
      break; // Stop sending remaining parts if one fails
    }
  }
}

// Check for duplicate messages
function isDuplicateMessage(author, content) {
  const key = `${author}:${content}`;
  if (recentMessages.has(key)) {
    return true;
  }

  recentMessages.set(key, Date.now());

  // Cleanup old entries
  const now = Date.now();
  for (const [storedKey, timestamp] of recentMessages.entries()) {
    if (now - timestamp > 5000) {
      recentMessages.delete(storedKey);
    }
  }

  return false;
}

// Main message handler
async function handleMessage(message, author, channelId, messageId, context = {}) {
  try {
    const { isReply, isReplyToBot, isBotMentioned, source } = context;
    const content = message || '';
    const lowerContent = content.toLowerCase().trim();

    console.log(`📨 Processing message: "${content}" from ${author} [${source}]`);

    // Check if from monitored channel
    if (!MONITORED_CHANNELS.includes(channelId)) {
      console.log(`⏭️ Ignoring message from non-monitored channel`);
      return;
    }

    // Handle commands
    if (lowerContent === '!help' || lowerContent === '!commands') {
      const isAdmin = author.toLowerCase() === ADMIN_USERNAME.toLowerCase();

      let helpText = "**🤖 Bot Commands**\n\n";
      helpText += "**General:**\n";
      helpText += "`!help` - Show this help\n";
      helpText += "`!botmode` - Check current mode\n\n";

      if (isAdmin) {
        helpText += "**Admin Commands:**\n";
        helpText += "`!botmode on` - Respond to all messages\n";
        helpText += "`!botmode off` - Only respond when mentioned/replied to\n\n";
      }

      helpText += "**Usage:**\n";
      helpText += "- Tag me @username for responses in any mode\n";
      helpText += "- Reply to my messages to continue conversations\n";
      helpText += `- Current mode: ${RESPOND_TO_ALL_MESSAGES ? 'ON' : 'OFF'}\n`;
      helpText += "- Primary: Llama 3.3 70B • Fallback: DeepSeek R1 8B ⚡\n";
      helpText += "- 🧠 **Conversation Memory: ENABLED**\n";
      helpText += "- 🔍 **Enhanced Debugging: ENABLED**";

      await replyToMessage(channelId, messageId, helpText);
      return;
    }

    // Handle mode commands
    if (lowerContent.startsWith('!botmode')) {
      const parts = lowerContent.split(' ');
      const mode = parts.length > 1 ? parts[1] : '';
      const response = toggleMode(mode, author);
      await replyToMessage(channelId, messageId, response);
      return;
    }

    // Skip empty messages unless mentioned/replied
    if (lowerContent === '' && !isBotMentioned && !isReplyToBot) {
      console.log(`⏭️ Ignoring empty message (not mentioned/replied)`);
      return;
    }

    // Determine if we should respond
    let shouldRespond = false;

    if (RESPOND_TO_ALL_MESSAGES) {
      shouldRespond = !isReply || isReplyToBot || isBotMentioned;
    } else {
      shouldRespond = isBotMentioned || isReplyToBot;
    }

    if (!shouldRespond) {
      const reason = isReply && !isReplyToBot ? 'reply to someone else' : 'not mentioned/replied to in OFF mode';
      console.log(`⏭️ Not responding: ${reason}`);
      return;
    }

    // Check for duplicates
    if (isDuplicateMessage(author, content)) {
      console.log(`⏭️ Ignoring duplicate message`);
      return;
    }

    // Log why we're responding
    if (isReplyToBot) {
      console.log(`💬 Responding: Reply to bot`);
    } else if (isBotMentioned) {
      console.log(`🏷️ Responding: Bot mentioned`);
    } else {
      console.log(`📢 Responding: ON mode (all messages)`);
    }

    // Get and send AI response with conversation memory
    console.log(`🚀 Getting AI response with conversation memory...`);
    const aiResponse = await getAIResponse(content, channelId, author);

    if (aiResponse && aiResponse.trim()) {
      console.log(`📏 Final response length: ${aiResponse.length} characters`);
      await sendAIResponse(channelId, messageId, aiResponse);
      console.log(`✅ Response sent successfully`);
    } else {
      console.log(`❌ Empty AI response, not sending`);
    }

  } catch (error) {
    console.error('❌ Error processing message:', error);
    try {
      await replyToMessage(channelId, messageId, "oops, something broke on my end");
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

// Start the bot
async function startBot() {
  console.log('🚀 Starting Discord AI Bot with Enhanced Debugging');
  console.log(`👤 Admin: ${ADMIN_USERNAME}`);
  console.log(`📡 Monitoring channels: ${MONITORED_CHANNELS.join(', ')}`);
  console.log(`⚙️ Mode: ${RESPOND_TO_ALL_MESSAGES ? 'ON (all messages)' : 'OFF (mentions only)'}`);
  console.log(`🧠 Primary Model: ${PRIMARY_MODEL}`);
  console.log(`🔄 Fallback Model: ${FALLBACK_MODEL}`);
  console.log(`📏 Max tokens: 600 (optimized for single Discord messages)`);
  console.log(`💾 Conversation memory: ENABLED (per-channel, 8 message history)`);
  console.log(`📱 Single message preference: ENABLED (1:1 response ratio)`);
  console.log(`🔍 Enhanced debugging: ENABLED`);

  try {
    await startMonitoring(MONITORED_CHANNELS, handleMessage);
    console.log(`🎉 Bot is running! Hybrid monitoring active.`);
    console.log(`💡 Tip: Use !help for commands`);

  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  console.log(`💾 Final memory status: ${conversationHistory.size} active conversations`);
  process.exit(0);
});

// Start the bot
startBot();
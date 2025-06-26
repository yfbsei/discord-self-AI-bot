// discord-ai-bot.js - Clean refactored version
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { replyToMessage, startMonitoring } from './discord-base.js';

dotenv.config();

// Validate environment variables
const requiredVars = ['USER_TOKEN', 'HUGGINGFACE_API_KEY', 'ADMIN_USERNAME', 'MONITORED_CHANNELS'];
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

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const MODEL_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct';

// Bot settings
let RESPOND_TO_ALL_MESSAGES = true; // ON mode by default
const recentMessages = new Map();

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

// Clean AI response text
function cleanResponse(text) {
  if (!text) return "";

  try {
    let cleaned = text
      .replace(/<\|.*?\|>/g, '') // Remove Llama tokens
      .replace(/^\s*(assistant|user|system):\s*/i, '') // Remove prefixes
      .replace(/^(as an ai|i'm an ai|as a language model)/i, '') // Remove AI speak
      .replace(/```[a-z]*\n|```/g, '') // Remove code blocks
      .replace(/^\d+\.\s*/gm, '') // Remove numbered lists
      .replace(/^[\-\*]\s*/gm, '') // Remove bullet points
      .trim()
      .replace(/\s+/g, ' ');

    // Get first sentence
    const sentences = cleaned.split(/[.!?]+/);
    if (sentences.length > 0 && sentences[0].trim()) {
      cleaned = sentences[0].trim();
      if (!cleaned.match(/[.!?]$/)) {
        cleaned += '.';
      }
    }

    // Limit length
    if (cleaned.length > 120) {
      cleaned = cleaned.substring(0, 120).trim() + '...';
    }

    return cleaned || "hmm, not sure about that";
  } catch (error) {
    console.error("Error cleaning response:", error);
    return "sorry, had trouble with that response";
  }
}

// Get AI response from Hugging Face
async function getAIResponse(message) {
  try {
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a casual, friendly person on Discord. Keep responses very short (1 sentence max), natural, and conversational. Be helpful but brief. No formal explanations.<|eot_id|><|start_header_id|>user<|end_header_id|>

${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;

    console.log(`🔄 Calling Hugging Face API...`);

    const response = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 40,
          temperature: 0.8,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
          stop: ["<|eot_id|>", "<|end_of_text|>", "\n\n"]
        }
      })
    });

    console.log(`📡 API Response Status: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ Hugging Face API error: ${response.status}`);

      // Quick fallback responses for common cases
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return "hey there!";
      }
      if (lowerMessage.includes('how') && lowerMessage.includes('you')) {
        return "I'm doing well, thanks!";
      }
      if (lowerMessage.includes('?')) {
        return "hmm, good question!";
      }

      return "sorry, having some technical issues right now";
    }

    const data = await response.json();
    let aiText = '';

    if (Array.isArray(data) && data.length > 0) {
      aiText = data[0].generated_text || data[0];
    } else if (data.generated_text) {
      aiText = data.generated_text;
    } else {
      aiText = String(data);
    }

    const cleaned = cleanResponse(aiText);
    console.log(`🤖 AI Response: "${cleaned}"`);
    return cleaned;

  } catch (error) {
    console.error("❌ Error getting AI response:", error);

    // Smart fallback responses
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "hey!";
    }
    if (lowerMessage.includes('how') && lowerMessage.includes('you')) {
      return "all good here!";
    }
    if (lowerMessage.includes('?')) {
      return "not sure about that one";
    }

    return "oops, something went wrong";
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

    console.log(`📝 Processing: "${content}" from ${author} [${source}]`);

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
      helpText += "- Powered by Llama 3.1 8B ⚡";

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
      // ON mode: respond to all messages except replies to others
      shouldRespond = !isReply || isReplyToBot || isBotMentioned;
    } else {
      // OFF mode: only respond to mentions and replies to bot
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

    // Get and send AI response
    console.log(`⏱️ Getting AI response for: "${content}"`);
    const aiResponse = await getAIResponse(content);

    if (aiResponse && aiResponse.trim()) {
      console.log(`📤 Sending response: "${aiResponse}"`);
      await replyToMessage(channelId, messageId, aiResponse);
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
  console.log('🚀 Starting Discord AI Bot');
  console.log(`👤 Admin: ${ADMIN_USERNAME}`);
  console.log(`📡 Monitoring channels: ${MONITORED_CHANNELS.join(', ')}`);
  console.log(`⚙️ Mode: ${RESPOND_TO_ALL_MESSAGES ? 'ON (all messages)' : 'OFF (mentions only)'}`);

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
  process.exit(0);
});

// Start the bot
startBot();
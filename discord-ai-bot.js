// discord-huggingface-bot.js with environment variables
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { listenForMessages, sendMessage, replyToMessage, getCurrentUser, pollChannel } from './discord-base.js';

// Load environment variables
dotenv.config();

// Validate all required environment variables first
const requiredEnvVars = ['HUGGINGFACE_API_KEY', 'ADMIN_USERNAME', 'MONITORED_CHANNELS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables in .env file:');
  missingVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('\nPlease create a .env file with all required variables.');
  console.error('Example .env file:');
  console.error('USER_TOKEN=your_discord_token_here');
  console.error('HUGGINGFACE_API_KEY=your_huggingface_key_here');
  console.error('ADMIN_USERNAME=your_admin_username_here');
  console.error('MONITORED_CHANNELS=[{"id":"your_channel_id","usePolling":false,"pollInterval":5000}]');
  process.exit(1);
}

// Configuration from environment variables (all required)
let MONITORED_CHANNELS;
try {
  MONITORED_CHANNELS = JSON.parse(process.env.MONITORED_CHANNELS);
} catch (error) {
  console.error('ERROR: Invalid JSON format in MONITORED_CHANNELS environment variable:', error);
  console.error('Expected format: [{"id":"channel_id","usePolling":false,"pollInterval":5000}]');
  process.exit(1);
}

// Simple array of just channel IDs for comparison
const CHANNEL_IDS = MONITORED_CHANNELS.map(channel => channel.id);

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct';

// Mode toggle configuration
let RESPOND_TO_ALL_MESSAGES = true; // Default to "ON" mode
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

// Store recent messages to avoid duplicates
const recentMessages = new Map();

// Function to toggle the bot's response mode
function toggleResponseMode(newMode, username) {
  // Only allow the specified admin user to toggle the mode
  if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    return `Sorry, only admin can change the bot's response mode.`;
  }

  if (newMode === 'on') {
    RESPOND_TO_ALL_MESSAGES = true;
    return "Mode changed to ON: I'll respond to all messages (except replies to other users).";
  } else if (newMode === 'off') {
    RESPOND_TO_ALL_MESSAGES = false;
    return "Mode changed to OFF: I'll only respond when tagged or replied to.";
  } else {
    return `Current mode: ${RESPOND_TO_ALL_MESSAGES ? 'ON' : 'OFF'}`;
  }
}

// Function to clean up response text and make it more human
function cleanResponseText(text) {
  if (!text) return "";

  if (typeof text !== 'string') {
    try {
      text = JSON.stringify(text);
    } catch (e) {
      return "Error processing response";
    }
  }

  try {
    let cleaned = text
      // Remove Llama 3 specific artifacts and tokens
      .replace(/<\|.*?\|>/g, '') // Remove all Llama 3 special tokens
      .replace(/<\/s>/g, '') // Remove end tokens
      .replace(/^\s*assistant:\s*/i, '') // Remove assistant prefix
      .replace(/^\s*user:\s*/i, '') // Remove user prefix
      .replace(/^\s*system:\s*/i, '') // Remove system prefix

      // Remove formal AI patterns that make it sound robotic
      .replace(/^(as an ai|i'm an ai|as a language model)/i, '')
      .replace(/^(here's|here are|let me|i'll|i can help)/i, '')
      .replace(/\b(step \d+:|first,|second,|third,|finally,)/gi, '')
      .replace(/\b(in summary|to summarize|in conclusion)/gi, '')
      .replace(/\|\|/g, '') // Remove || separators
      .replace(/##+/g, '') // Remove ### headers
      .replace(/\[greet\]/g, '') // Remove action tags

      // Remove numbered lists and bullet points
      .replace(/^\d+\.\s*/gm, '')
      .replace(/^[\-\*]\s*/gm, '')

      // Remove extra formatting
      .replace(/```[a-z]*\n|```/g, '')
      .replace(/^["']|["']$/g, '')

      // Clean up whitespace and limit to first sentence or two
      .trim()
      .replace(/\s+/g, ' ')
      .split(/[.!?]+/)[0] + (text.includes('.') || text.includes('!') || text.includes('?') ?
        (text.match(/[.!?]/) ? text.match(/[.!?]/)[0] : '.') : '');

    // If it's still too long, cut it short
    if (cleaned.length > 120) {
      cleaned = cleaned.substring(0, 120).trim();
      if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
        cleaned += '...';
      }
    }

    return cleaned;
  } catch (error) {
    console.error("Error in cleanResponseText:", error);
    return typeof text === 'string' ? text : "Unable to process response";
  }
}

// Get AI response from Llama 3.1
async function getHuggingFaceResponse(message) {
  try {
    console.log(`Sending message to Llama 3.1: ${message}`);

    // Llama 3.1 uses a specific chat template format with a more human personality
    const llamaPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a casual, friendly person chatting on Discord. Keep responses short (1-2 sentences max), natural, and conversational. Don't be overly helpful or formal. Talk like a real human - use casual language, contractions, and keep it brief. No step-by-step explanations or formal structure.<|eot_id|><|start_header_id|>user<|end_header_id|>

${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;

    // Call Hugging Face API
    const response = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`
      },
      body: JSON.stringify({
        inputs: llamaPrompt,
        parameters: {
          max_new_tokens: 50,        // Much shorter responses
          temperature: 0.8,          // More natural variability
          top_p: 0.9,               // Good balance for casual chat
          do_sample: true,          // Enable sampling
          return_full_text: false,  // Only return generated text
          stop: ["<|eot_id|>", "<|end_of_text|>", "\n\n"] // Stop at natural breaks
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Hugging Face API error: ${response.status}`, errorData);
      return "Sorry, I couldn't generate a response at the moment.";
    }

    let data;
    try {
      data = await response.json();
      console.log("Raw response data:", JSON.stringify(data).substring(0, 200) + "...");
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError);
      return "Sorry, I received an invalid response from the AI service.";
    }

    // Extract the text with proper type checking
    let aiResponse = '';

    if (data === null || data === undefined) {
      return "I received an empty response. Could you please try again?";
    }

    if (typeof data === 'string') {
      aiResponse = data;
    } else if (Array.isArray(data)) {
      if (data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'string') {
          aiResponse = firstItem;
        } else if (typeof firstItem === 'object' && firstItem !== null) {
          aiResponse = firstItem.generated_text || JSON.stringify(firstItem);
        } else {
          aiResponse = String(firstItem);
        }
      }
    } else if (typeof data === 'object') {
      aiResponse = data.generated_text || JSON.stringify(data);
    } else {
      aiResponse = String(data);
    }

    // Apply cleaning to make it more human
    aiResponse = cleanResponseText(aiResponse);

    console.log(`AI response received (${aiResponse.length} chars): ${aiResponse}`);
    return aiResponse || "hm, not sure about that one";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "oof, something went wrong on my end";
  }
}

// Check if we've already processed this message
function isDuplicateMessage(author, content) {
  const key = `${author}:${content}`;

  // Check if we've seen this message in the last 5 seconds
  if (recentMessages.has(key)) {
    return true;
  }

  // Add to recent messages and set expiry
  recentMessages.set(key, Date.now());

  // Cleanup old messages (older than 5 seconds)
  const now = Date.now();
  for (const [storedKey, timestamp] of recentMessages.entries()) {
    if (now - timestamp > 5000) {
      recentMessages.delete(storedKey);
    }
  }

  return false;
}

// Custom message handler for Discord messages
async function handleDiscordMessage(message, author, channelId, messageId, messageContext = {}) {
  try {
    // Add debug logging
    console.log(`Debug - Received message: '${message}' from ${author} in channel ${channelId}`);

    // Check if message is from a monitored channel
    if (!CHANNEL_IDS.includes(channelId)) {
      console.log(`Ignoring message from non-monitored channel ${channelId}`);
      return;
    }

    const { isReply, isReplyToBot, isBotMentioned, hasAttachments } = messageContext;

    // FIXED: Declare lowerMessage BEFORE using it
    const lowerMessage = (message || '').toLowerCase().trim();

    // Skip attachment-only messages UNLESS specifically mentioned or replied to
    if (hasAttachments && lowerMessage === '' && !isBotMentioned && !isReplyToBot) {
      console.log(`Ignoring attachment-only message from ${author} (not mentioned/replied to)`);
      return;
    }

    // Skip if message is empty/whitespace only and not a command, mention, or reply
    if (lowerMessage === '' && !isBotMentioned && !isReplyToBot) {
      console.log(`Ignoring empty message from ${author} (not mentioned/replied to)`);
      return;
    }

    // Check for possible commands
    if (lowerMessage === '!help' || lowerMessage === 'help' ||
      lowerMessage === '!commands' || lowerMessage === 'commands') {

      console.log("Help command detected!");

      const isAdmin = author.toLowerCase() === ADMIN_USERNAME.toLowerCase();

      let helpText = "**Available Commands:**\n\n";

      // Basic commands for everyone
      helpText += "**General Commands:**\n";
      helpText += "`!help` or `!commands` - Show this help message\n\n";

      // Mode commands (admin only)
      helpText += "**Mode Commands:**\n";
      helpText += "`!botmode` - Check current bot mode\n";
      if (isAdmin) {
        helpText += "`!botmode on` - Set bot to respond to all messages\n";
        helpText += "`!botmode off` - Set bot to only respond when tagged or replied to\n\n";
      } else {
        helpText += "Note: Mode toggle commands are admin-only\n\n";
      }

      // Channel management commands (admin only)
      helpText += "**Channel Management:**\n";
      if (isAdmin) {
        helpText += "`!listchannels` - List all monitored channels\n";
        helpText += "`!addchannel [channelID]` - Add a channel to monitor (using gateway)\n";
        helpText += "`!addchannel [channelID] poll` - Add a channel with polling enabled\n";
        helpText += "`!removechannel [channelID]` - Remove a channel from monitoring\n\n";
      } else {
        helpText += "Note: Channel management commands are admin-only\n\n";
      }

      // Tips for interacting with the bot
      helpText += "**Interaction Tips:**\n";
      helpText += "- Tag me with @username to get a response in any mode\n";
      helpText += "- Reply to one of my messages to continue a conversation\n";
      helpText += "- In ON mode (default), I'll respond to all messages except replies to other users\n";
      helpText += "- In OFF mode, I'll only respond when tagged or replied to\n";
      helpText += "- Currently using: Llama 3.1 8B Instruct (human-like mode)\n";

      await replyToMessage(channelId, messageId, helpText);
      return;
    }

    // Check for mode toggle command
    if (lowerMessage.startsWith("!botmode ")) {
      const mode = lowerMessage.split("!botmode ")[1].trim();
      const response = toggleResponseMode(mode, author);
      await replyToMessage(channelId, messageId, response);
      return;
    }

    // Check for channel management commands
    if (lowerMessage.startsWith("!addchannel ")) {
      // Only admin can add channels
      if (author.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
        await replyToMessage(channelId, messageId, `Sorry, only ${ADMIN_USERNAME} can add channels.`);
        return;
      }

      const parts = lowerMessage.split("!addchannel ")[1].trim().split(" ");
      const newChannelId = parts[0];
      const usePolling = parts.length > 1 ? parts[1] === "poll" : false;

      if (newChannelId && /^\d+$/.test(newChannelId)) {
        if (!CHANNEL_IDS.includes(newChannelId)) {
          // Add to both arrays
          MONITORED_CHANNELS.push({
            id: newChannelId,
            usePolling: usePolling,
            pollInterval: 3000
          });
          CHANNEL_IDS.push(newChannelId);

          // Start polling if requested
          if (usePolling) {
            pollChannel(newChannelId, handleDiscordMessage, 3000);
          }

          await replyToMessage(channelId, messageId, `Added channel ${newChannelId} to monitored channels${usePolling ? " with polling enabled" : ""}.`);
        } else {
          await replyToMessage(channelId, messageId, `Channel ${newChannelId} is already being monitored.`);
        }
      } else {
        await replyToMessage(channelId, messageId, "Please provide a valid channel ID.");
      }
      return;
    }

    if (lowerMessage.startsWith("!listchannels") || lowerMessage === "!listchannels") {
      if (author.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
        await replyToMessage(channelId, messageId, `Sorry, only ${ADMIN_USERNAME} can list channels.`);
        return;
      }

      const channelList = MONITORED_CHANNELS.map(ch =>
        `${ch.id} (${ch.usePolling ? "Polling" : "Gateway"})`
      ).join('\n');
      await replyToMessage(channelId, messageId, `Currently monitoring these channels:\n${channelList}`);
      return;
    }

    if (lowerMessage.startsWith("!removechannel ")) {
      if (author.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
        await replyToMessage(channelId, messageId, `Sorry, only ${ADMIN_USERNAME} can remove channels.`);
        return;
      }

      const channelToRemove = lowerMessage.split("!removechannel ")[1].trim();

      // Remove from CHANNEL_IDS array
      const idIndex = CHANNEL_IDS.indexOf(channelToRemove);
      if (idIndex !== -1) {
        CHANNEL_IDS.splice(idIndex, 1);
      }

      // Remove from MONITORED_CHANNELS array
      const channelIndex = MONITORED_CHANNELS.findIndex(ch => ch.id === channelToRemove);
      if (channelIndex !== -1) {
        MONITORED_CHANNELS.splice(channelIndex, 1);
        await replyToMessage(channelId, messageId, `Removed channel ${channelToRemove} from monitored channels.`);
      } else {
        await replyToMessage(channelId, messageId, `Channel ${channelToRemove} is not in the monitored list.`);
      }
      return;
    }

    // Check if we should process this message based on current mode
    let shouldProcess = false;

    if (RESPOND_TO_ALL_MESSAGES) {
      // ON mode: Process all direct messages and replies to the bot
      // Don't process if it's a reply to someone else
      shouldProcess = !isReply || isReplyToBot || isBotMentioned;
    } else {
      // OFF mode: Only process if it directly mentions the bot or is a reply to the bot
      shouldProcess = isBotMentioned || isReplyToBot;
    }

    // Don't process if we shouldn't
    if (!shouldProcess) {
      if (isReply && !isReplyToBot) {
        console.log(`Ignoring message from ${author} because it's a reply to another user`);
      } else if (!RESPOND_TO_ALL_MESSAGES && !isBotMentioned && !isReplyToBot) {
        console.log(`Ignoring message from ${author} because bot is in mention-only mode`);
      }
      return;
    }

    // Log why we're processing this message
    if (isReplyToBot) {
      console.log(`Processing message from ${author} because it's a reply to the bot`);
    } else if (isBotMentioned) {
      console.log(`Processing message from ${author} because it mentions the bot`);
    } else {
      console.log(`Processing message from ${author} because bot is in standard mode`);
    }

    // Check for duplicate messages to prevent loops
    if (isDuplicateMessage(author, message)) {
      console.log(`Ignoring duplicate message from ${author}`);
      return;
    }

    console.log(`Processing message from ${author}: ${message}`);

    // Get response from the AI
    const aiResponse = await getHuggingFaceResponse(message);

    if (aiResponse && aiResponse.trim()) {
      // Reply to the original message instead of sending a new message
      await replyToMessage(channelId, messageId, aiResponse);
      console.log(`Reply sent to message ${messageId} in channel ${channelId}`);
    } else {
      console.log('Empty response from AI, not sending to Discord');
    }
  } catch (error) {
    console.error('Error processing message:', error);

    // Send error message as a reply
    try {
      await replyToMessage(channelId, messageId, "oof, something broke on my end");
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

// Start the bot
async function startBot() {
  console.log('Starting Discord AI bot with Llama 3.1 (human-like mode)...');
  console.log(`Admin user: ${ADMIN_USERNAME}`);
  console.log(`Monitoring ${MONITORED_CHANNELS.length} channels:`);
  MONITORED_CHANNELS.forEach(channel => {
    console.log(`- Channel ${channel.id} (${channel.usePolling ? "Polling" : "Gateway"})`);
  });

  try {
    // First, get our user information (which sets the MY_USER_ID)
    await getCurrentUser();

    // Start up polling for channels that need it
    MONITORED_CHANNELS.forEach(channel => {
      if (channel.usePolling) {
        console.log(`Setting up polling for channel ${channel.id}`);
        pollChannel(channel.id, handleDiscordMessage, channel.pollInterval);
      }
    });

    // Pass our custom message handler to the listenForMessages function
    await listenForMessages(handleDiscordMessage);
    console.log('Bot is running and listening for messages in human-like mode');
  } catch (error) {
    console.error('Failed to start bot:', error);
  }
}

// Start the bot
startBot();
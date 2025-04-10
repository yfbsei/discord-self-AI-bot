// discord-huggingface-bot.js
import fetch from 'node-fetch';
import { listenForMessages, sendMessage, replyToMessage, getCurrentUser, pollChannel } from './discord-base.js';

// Configuration
// Replace single channel ID with an array of channel IDs and their polling settings
const MONITORED_CHANNELS = [
  {
    id: '1359680222161944693',  // Your original channel
    usePolling: false,          // No polling needed for this channel
    pollInterval: 5000          // Poll every 5 seconds (unused if polling disabled)
  },
  {
    id: '782314531755694081',   // Your friend's channel
    usePolling: true,           // Enable polling for this channel
    pollInterval: 3000          // Poll every 3 seconds
  },
];

// Simple array of just channel IDs for comparison
const CHANNEL_IDS = MONITORED_CHANNELS.map(channel => channel.id);

const HUGGINGFACE_API_KEY = 'your HUGGINGFACE API KEY';
const MODEL_URL = 'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct';

// Mode toggle configuration
let RESPOND_TO_ALL_MESSAGES = true; // Default to "ON" mode
const ADMIN_USERNAME = "your admin account. make sure not same as bot AI account"; // Only this user can toggle the mode

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

// Function to clean up response text
function cleanResponseText(text) {
  // First, check if text is null, undefined, or not a string
  if (!text) return ""; 
  
  // Convert to string if it's not already a string
  if (typeof text !== 'string') {
    try {
      text = JSON.stringify(text);
    } catch (e) {
      return "Error processing response";
    }
  }
  
  // Now that we're sure text is a string, we can use replace
  try {
    // Remove template tags and formatting instructions
    let cleaned = text
      // Remove ef{indent} variations
      .replace(/ef\{indent[^}]*\}/g, '')
      .replace(/ef\{indent-[^}]*\}/g, '')
      .replace(/ef\{[^}]*\}/g, '')
      
      // Remove any markdown formatting codes
      .replace(/```[a-z]*\n|```/g, '')
      
      // Remove common AI response patterns
      .replace(/^(as an ai|i'm an ai|as a language model)/i, '')
      
      // Remove any leading/trailing quotes
      .replace(/^["']|["']$/g, '')
      
      // Remove leading whitespace and clean up extra spaces
      .trim()
      .replace(/\s+/g, ' ');
    
    return cleaned;
  } catch (error) {
    console.error("Error in cleanResponseText:", error);
    // If there's an error in the cleaning process, return the original text or a fallback
    return typeof text === 'string' ? text : "Unable to process response";
  }
}

// Get AI response from Llama 3
async function getHuggingFaceResponse(message) {
  try {
    console.log(`Sending message to Llama 3: ${message}`);
    
    // Llama 3 works with a chat completion format
    const llamaPrompt = `<|begin_of_text|><|user|>
${message}
<|assistant|>`;
    
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
          max_new_tokens: 100,     // Allow longer, more complete responses
          temperature: 0.85,       // Slightly higher temperature for more natural variety
          top_p: 0.92,             // Slightly lower top_p for more focused but still diverse text
          top_k: 40,               // Add top_k to control diversity while maintaining coherence
          repetition_penalty: 1.1, // Discourage repetitive phrases/words
          do_sample: true,         // Enable sampling (required for temperature/top_p to work)
          return_full_text: false  // Only return the model's response, not the input prompt
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
    
    // For Llama 3, remove any ending tags that might be in the response
    aiResponse = aiResponse.replace(/<\|.*?\|>/g, '');
    
    // Apply cleaning
    aiResponse = cleanResponseText(aiResponse);
    
    console.log(`AI response received (${aiResponse.length} chars)`);
    return aiResponse || "I don't have a specific answer for that question.";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "Sorry, I encountered an error while processing your request.";
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
    
    const { isReply, isReplyToBot, isBotMentioned } = messageContext;
    
    // Special handling for empty messages that might be commands
    // Look for command patterns in the message object or context
    const lowerMessage = (message || '').toLowerCase().trim();
    
    // Check for possible commands even with empty messages
    if (lowerMessage === '' || lowerMessage === '!help' || lowerMessage === 'help' || 
        lowerMessage === '!commands' || lowerMessage === 'commands') {
      // Check if message ID or other context clues suggest this is a help command
      console.log("Potential help command detected!");
      
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
    
    // Final cleanup of any formatting that might have slipped through
    const cleanedResponse = cleanResponseText(aiResponse);
    
    if (cleanedResponse && cleanedResponse.trim()) {
      // Reply to the original message instead of sending a new message
      await replyToMessage(channelId, messageId, cleanedResponse);
      console.log(`Reply sent to message ${messageId} in channel ${channelId}`);
    } else {
      console.log('Empty response from AI, not sending to Discord');
    }
  } catch (error) {
    console.error('Error processing message:', error);
    
    // Send error message as a reply
    try {
      await replyToMessage(channelId, messageId, "Sorry, I encountered an error while processing your message.");
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

// Start the bot
async function startBot() {
  console.log('Starting Discord AI bot with Llama 3 8B integration...');
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
    console.log('Bot is running and listening for messages');
  } catch (error) {
    console.error('Failed to start bot:', error);
  }
}

// Start the bot
startBot();
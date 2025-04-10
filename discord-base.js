// discord-base.js with polling support
import fetch from 'node-fetch';
import { WebSocket } from 'ws';

// Your existing user token
const USER_TOKEN = 'your discord auth token';
const API_VERSION = '9';

// We'll fetch the user ID dynamically rather than hardcoding it
let MY_USER_ID = null; // leave it as null

// Store message IDs we've seen from polling to avoid duplicates
const processedMessageIds = new Set();

// Function to make API requests to Discord
async function discordRequest(endpoint, options = {}) {
  const url = `https://discord.com/api/v${API_VERSION}/${endpoint}`;
  const headers = {
    'Authorization': USER_TOKEN,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    headers,
    ...options
  });

  if (!response.ok) {
    try {
      const data = await response.json();
      console.error('API Error:', data);
    } catch (e) {
      console.error('API Error (no JSON):', response.status, response.statusText);
    }
    throw new Error(`Discord API error: ${response.status}`);
  }

  return response.json();
}

// Reply to a specific message
async function replyToMessage(channelId, messageId, content) {
  return discordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: content,
      message_reference: {
        message_id: messageId,
        channel_id: channelId,
        fail_if_not_exists: false
      }
    })
  });
}

// Get current user information (to properly identify our own messages)
async function getCurrentUser() {
  try {
    const userData = await discordRequest('users/@me');
    MY_USER_ID = userData.id;
    console.log(`Authenticated as user: ${userData.username} (ID: ${MY_USER_ID})`);
    return userData;
  } catch (error) {
    console.error('Failed to get current user data:', error);
    throw error;
  }
}

// Read messages from a channel (most recent)
async function getChannelMessages(channelId, limit = 50) {
  return discordRequest(`channels/${channelId}/messages?limit=${limit}`);
}

// Send a message to a channel
async function sendMessage(channelId, content) {
  return discordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

// Poll for new messages in a channel
async function pollChannel(channelId, messageHandler, interval = 5000) {
  console.log(`Starting polling for channel ${channelId} at ${interval}ms intervals`);
  let lastMessageId = null;
  
  // Initial fetch to get last message ID
  try {
    const initialMessages = await discordRequest(`channels/${channelId}/messages?limit=1`);
    if (initialMessages.length > 0) {
      lastMessageId = initialMessages[0].id;
      console.log(`Initial last message ID for channel ${channelId}: ${lastMessageId}`);
    }
  } catch (error) {
    console.error(`Error fetching initial messages for channel ${channelId}:`, error);
  }
  
  // Set up polling interval
  const pollInterval = setInterval(async () => {
    try {
      // Get the latest messages from the channel
      const messages = await discordRequest(`channels/${channelId}/messages?limit=5`);
      
      // Process new messages (newest first)
      for (const message of messages) {
        // Skip if we've already processed this message
        if (processedMessageIds.has(message.id) || 
            (lastMessageId && message.id <= lastMessageId)) {
          continue;
        }
        
        // Skip if it's from your own account
        if (message.author.id === MY_USER_ID) continue;
        
        // Skip if it's from a bot
        if (message.author.bot) continue;
        
        console.log(`[POLL] New message in ${channelId} from ${message.author.username}: ${message.content}`);
        
        // Check if this message mentions the bot
        let isBotMentioned = false;
        if (message.mentions && Array.isArray(message.mentions)) {
          isBotMentioned = message.mentions.some(mention => mention.id === MY_USER_ID);
        }
        
        // Check if this is a reply
        const isReply = message.message_reference ? true : false;
        
        // If it's a reply, check if it's replying to the bot
        let isReplyToBot = false;
        if (isReply && message.message_reference) {
          try {
            const repliedToMessage = await discordRequest(
              `channels/${message.channel_id}/messages/${message.message_reference.message_id}`
            );
            isReplyToBot = repliedToMessage.author.id === MY_USER_ID;
          } catch (error) {
            console.error('Error fetching replied-to message:', error);
          }
        }
        
        // Add to processed messages
        processedMessageIds.add(message.id);
        
        // Process the message using the message handler
        if (messageHandler) {
          await messageHandler(
            message.content,
            message.author.username,
            message.channel_id,
            message.id,
            {
              isReply,
              isReplyToBot,
              isBotMentioned
            }
          );
        }
      }
      
      // Update the last seen message ID if we found new messages
      if (messages.length > 0) {
        lastMessageId = messages[0].id;
      }
      
      // Clean up old message IDs from the processed set (keep last 100)
      if (processedMessageIds.size > 100) {
        const toRemove = processedMessageIds.size - 100;
        const idsArray = Array.from(processedMessageIds);
        for (let i = 0; i < toRemove; i++) {
          processedMessageIds.delete(idsArray[i]);
        }
      }
    } catch (error) {
      console.error(`Error polling channel ${channelId}:`, error);
    }
  }, interval);
  
  // Return the interval handle so it can be cleared if needed
  return pollInterval;
}

// Connect to Discord Gateway and listen for new messages
// Now accepts a custom messageHandler function as a parameter
async function listenForMessages(messageHandler = null) {
  // First, get our own user ID if we don't have it yet
  if (!MY_USER_ID) {
    await getCurrentUser();
  }
  
  // Get the gateway URL
  const gateway = await discordRequest('gateway');
  const ws = new WebSocket(`${gateway.url}?v=${API_VERSION}&encoding=json`);
  
  let interval;
  let sequence = null;

  ws.on('open', () => {
    console.log('Connected to Discord Gateway');
  });

  ws.on('message', async (data) => {
    const payload = JSON.parse(data);

    // Log all the guild channels when receiving the READY event
    if (payload.t === 'READY') {
      console.log('READY event received');
      if (payload.d && payload.d.guilds) {
        payload.d.guilds.forEach(guild => {
          console.log(`Guild: ${guild.id} (${guild.name})`);
          if (guild.channels) {
            guild.channels.forEach(channel => {
              console.log(`Channel: ${channel.id} (${channel.name})`);
            });
          }
        });
      }
    }

    const { op, d, s, t } = payload;
    
    if (s) sequence = s;

    switch (op) {
      case 10: // Hello
        interval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: sequence }));
        }, d.heartbeat_interval);
        
        // Identify with the gateway
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: USER_TOKEN,
            properties: {
              $os: 'linux',
              $browser: 'chrome',
              $device: 'chrome'
            },
            intents: 32767 // Request all intents
          }
        }));
        break;
        
      case 0: // Event Dispatch
        if (t === 'MESSAGE_CREATE') {
          // Log message info for debugging
          console.log(`Message from user ID: ${d.author.id}, MY_USER_ID: ${MY_USER_ID}, Bot: ${d.author.bot ? 'Yes' : 'No'}`);
          
          // Add message ID to processed messages to avoid duplicate processing from polling
          processedMessageIds.add(d.id);
          
          // Ignore your own messages to prevent loops
          if (d.author.id === MY_USER_ID) {
            console.log('Ignoring own message');
            return;
          }
          
          // Ignore messages from bots
          if (d.author.bot) {
            console.log('Ignoring bot message');
            return;
          }
          
          // Check if this message mentions the bot (either by @mention or by user ID)
          let isBotMentioned = false;
          
          // Check for mentions in the mentions array
          if (d.mentions && Array.isArray(d.mentions)) {
            isBotMentioned = d.mentions.some(mention => mention.id === MY_USER_ID);
          }
          
          // Also check if the bot's ID or username appears in the content
          // This handles cases where the message doesn't have a proper mention object
          if (!isBotMentioned) {
            const botUsername = await getCurrentUser().then(user => user.username.toLowerCase());
            isBotMentioned = d.content.toLowerCase().includes(`@${botUsername}`) || 
                             d.content.includes(MY_USER_ID);
          }
          
          // Check if this message is a reply
          const isReply = d.message_reference ? true : false;
          
          // If it's a reply, check if it's replying to the bot
          let isReplyToBot = false;
          if (isReply && d.message_reference) {
            // We need to fetch the message being replied to
            try {
              const repliedToMessage = await discordRequest(`channels/${d.channel_id}/messages/${d.message_reference.message_id}`);
              isReplyToBot = repliedToMessage.author.id === MY_USER_ID;
              console.log(`Message is a reply to ${repliedToMessage.author.username} (bot? ${isReplyToBot})`);
            } catch (error) {
              console.error('Error fetching replied-to message:', error);
            }
          }
          
          // Log if bot is mentioned
          if (isBotMentioned) {
            console.log(`Bot was mentioned in this message`);
          }
          
          console.log(`[GATEWAY] New message from ${d.author.username}: ${d.content}`);
          
          // Use the custom message handler if provided
          if (messageHandler) {
            // Pass relevant data to handler
            await messageHandler(
              d.content, 
              d.author.username, 
              d.channel_id, 
              d.id, 
              {
                isReply,
                isReplyToBot,
                isBotMentioned
              }
            );
          }
        }
        break;
    }
  });

  ws.on('close', (code) => {
    console.log(`Connection closed with code ${code}`);
    clearInterval(interval);
    
    // Attempt to reconnect
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      listenForMessages(messageHandler);
    }, 5000);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  // Return the WebSocket instance in case it's needed elsewhere
  return ws;
}

// Export functions for use in other files
export {
  discordRequest,
  getChannelMessages,
  sendMessage,
  replyToMessage,
  listenForMessages,
  getCurrentUser,
  pollChannel
};
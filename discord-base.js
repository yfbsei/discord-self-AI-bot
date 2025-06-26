// discord-base.js - Clean refactored version
import fetch from 'node-fetch';
import { WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const USER_TOKEN = process.env.USER_TOKEN;
const API_VERSION = '9';

if (!USER_TOKEN) {
  console.error('ERROR: USER_TOKEN is required in .env file');
  process.exit(1);
}

let MY_USER_ID = null;
let MY_USERNAME = null;
const processedMessageIds = new Set();
const pollingIntervals = new Map();

// Discord API request helper
async function discordRequest(endpoint, options = {}) {
  const url = `https://discord.com/api/v${API_VERSION}/${endpoint}`;
  const headers = {
    'Authorization': USER_TOKEN,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { headers, ...options });

  if (!response.ok) {
    try {
      const data = await response.json();
      console.error('API Error:', data);
    } catch (e) {
      console.error('API Error:', response.status, response.statusText);
    }
    throw new Error(`Discord API error: ${response.status}`);
  }

  return response.json();
}

// Get current user info
async function getCurrentUser() {
  try {
    const userData = await discordRequest('users/@me');
    MY_USER_ID = userData.id;
    MY_USERNAME = userData.username;
    console.log(`🤖 Authenticated as: ${userData.username} (ID: ${MY_USER_ID})`);
    return userData;
  } catch (error) {
    console.error('Failed to get user data:', error);
    throw error;
  }
}

// Send reply to a message
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

// Enhanced mention detection
function checkForMention(messageContent, mentions = []) {
  if (!messageContent) return false;

  const content = messageContent.toLowerCase();

  // Check Discord mentions array
  if (mentions && Array.isArray(mentions)) {
    if (mentions.some(mention => mention.id === MY_USER_ID)) return true;
  }

  // Check for username mentions
  if (MY_USERNAME && content.includes(MY_USERNAME.toLowerCase())) {
    return true;
  }

  // Check for user ID mentions
  if (MY_USER_ID && content.includes(MY_USER_ID)) {
    return true;
  }

  return false;
}

// Safe message fetching (handles user token limitations)
async function safeGetRepliedMessage(channelId, messageId) {
  try {
    return await discordRequest(`channels/${channelId}/messages/${messageId}`);
  } catch (error) {
    console.log(`⚠️ Cannot fetch replied message (user token limitation)`);
    return null;
  }
}

// Polling system for reliable message reading
async function startPolling(channelId, messageHandler) {
  console.log(`📡 Starting polling for channel ${channelId}`);
  let lastMessageId = null;

  // Get initial last message ID
  try {
    const initialMessages = await discordRequest(`channels/${channelId}/messages?limit=1`);
    if (initialMessages.length > 0) {
      lastMessageId = initialMessages[0].id;
    }
  } catch (error) {
    console.error(`Error getting initial messages for ${channelId}:`, error);
  }

  const pollInterval = setInterval(async () => {
    try {
      const messages = await discordRequest(`channels/${channelId}/messages?limit=3`);

      for (const message of messages) {
        // Skip if already processed or old
        if (processedMessageIds.has(message.id) ||
          (lastMessageId && message.id <= lastMessageId)) {
          continue;
        }

        // Skip own messages and bots
        if (message.author.id === MY_USER_ID || message.author.bot) {
          continue;
        }

        console.log(`📨 [POLLING] New message from ${message.author.username}: "${message.content}"`);

        // Check for mentions and replies
        const isBotMentioned = checkForMention(message.content, message.mentions);
        const isReply = !!message.message_reference;

        let isReplyToBot = false;
        if (isReply && message.message_reference) {
          const repliedMessage = await safeGetRepliedMessage(
            message.channel_id,
            message.message_reference.message_id
          );
          if (repliedMessage) {
            isReplyToBot = repliedMessage.author.id === MY_USER_ID;
          }
        }

        // Mark as processed
        processedMessageIds.add(message.id);

        // Process the message
        if (messageHandler) {
          await messageHandler(
            message.content,
            message.author.username,
            message.channel_id,
            message.id,
            {
              isReply,
              isReplyToBot,
              isBotMentioned,
              hasAttachments: message.attachments && message.attachments.length > 0,
              source: 'polling'
            }
          );
        }
      }

      // Update last message ID
      if (messages.length > 0) {
        lastMessageId = messages[0].id;
      }

      // Cleanup old processed IDs
      if (processedMessageIds.size > 200) {
        const oldIds = Array.from(processedMessageIds).slice(0, 100);
        oldIds.forEach(id => processedMessageIds.delete(id));
      }

    } catch (error) {
      console.error(`Error polling channel ${channelId}:`, error);
    }
  }, 800); // Poll every 0.8 seconds for near-instant responses

  pollingIntervals.set(channelId, pollInterval);
  return pollInterval;
}

// Gateway system for instant mentions/replies
async function startGateway(messageHandler) {
  console.log(`⚡ Starting Gateway for instant responses`);

  try {
    const gateway = await discordRequest('gateway');
    const ws = new WebSocket(`${gateway.url}?v=${API_VERSION}&encoding=json`);

    let heartbeatInterval;
    let sequence = null;

    ws.on('open', () => {
      console.log('🔗 Connected to Discord Gateway');
    });

    ws.on('message', async (data) => {
      const payload = JSON.parse(data);
      const { op, d, s, t } = payload;

      if (s) sequence = s;

      switch (op) {
        case 10: // Hello
          heartbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: sequence }));
          }, d.heartbeat_interval);

          // Identify
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: USER_TOKEN,
              properties: {
                $os: 'windows',
                $browser: 'discord_desktop',
                $device: 'desktop'
              },
              intents: 513 // GUILDS + GUILD_MESSAGES
            }
          }));
          break;

        case 0: // Event
          if (t === 'MESSAGE_CREATE') {
            // Skip own messages and bots
            if (d.author.id === MY_USER_ID || d.author.bot) return;

            console.log(`⚡ [GATEWAY] Message from ${d.author.username}: "${d.content}"`);

            // Only process if has content OR is mention/reply
            const hasContent = d.content && d.content.trim().length > 0;
            const isBotMentioned = checkForMention(d.content, d.mentions);
            const isReply = !!d.message_reference;

            let isReplyToBot = false;
            if (isReply && d.message_reference) {
              const repliedMessage = await safeGetRepliedMessage(
                d.channel_id,
                d.message_reference.message_id
              );
              if (repliedMessage) {
                isReplyToBot = repliedMessage.author.id === MY_USER_ID;
              }
            }

            // Gateway can handle: mentions, replies to bot, or messages with content
            const canProcess = hasContent || isBotMentioned || isReplyToBot;

            if (canProcess) {
              // Mark as processed to avoid duplicate from polling
              processedMessageIds.add(d.id);

              if (messageHandler) {
                await messageHandler(
                  d.content || '',
                  d.author.username,
                  d.channel_id,
                  d.id,
                  {
                    isReply,
                    isReplyToBot,
                    isBotMentioned,
                    hasAttachments: d.attachments && d.attachments.length > 0,
                    source: 'gateway'
                  }
                );
              }
            } else {
              console.log(`⏭️ Gateway skipping empty message (polling will handle it)`);
            }
          }
          break;
      }
    });

    ws.on('close', (code) => {
      console.log(`Gateway closed: ${code}`);
      clearInterval(heartbeatInterval);
      // Auto-reconnect
      setTimeout(() => startGateway(messageHandler), 5000);
    });

    ws.on('error', (error) => {
      console.error('Gateway error:', error);
    });

    return ws;
  } catch (error) {
    console.error('Failed to start gateway:', error);
    throw error;
  }
}

// Main function to start monitoring channels
async function startMonitoring(channelIds, messageHandler) {
  if (!MY_USER_ID) {
    await getCurrentUser();
  }

  console.log(`🎯 Monitoring ${channelIds.length} channels: ${channelIds.join(', ')}`);

  // Start polling for all channels (reliable message reading)
  for (const channelId of channelIds) {
    await startPolling(channelId, messageHandler);
  }

  // Start gateway for instant mentions/replies
  await startGateway(messageHandler);

  console.log(`✅ Bot monitoring active - Hybrid system running`);
}

// Cleanup function
function stopMonitoring() {
  pollingIntervals.forEach((interval, channelId) => {
    clearInterval(interval);
    console.log(`Stopped polling for channel ${channelId}`);
  });
  pollingIntervals.clear();
}

export {
  discordRequest,
  replyToMessage,
  getCurrentUser,
  startMonitoring,
  stopMonitoring
};
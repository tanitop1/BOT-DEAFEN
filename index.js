import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import { keepAlive } from './keep_alive.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
keepAlive();

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Store the original channels of users
const userOriginalChannels = new Map();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server configurations from config.json
const configPath = path.resolve(__dirname, 'config.json');
let serverConfigs = JSON.parse(fs.readFileSync(configPath, 'utf-8')).servers;

// Save server configurations to config.json
const saveConfig = () => {
  fs.writeFileSync(configPath, JSON.stringify({ servers: serverConfigs }, null, 2));
};

// Ready event handler
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Command to set the deafened channel
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!setDeafenedChannel')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('You do not have permission to use this command.');
    }

    const channelId = message.content.split(' ')[1];
    if (!channelId) {
      return message.reply('Please provide a valid channel ID.');
    }

    if (!serverConfigs[message.guild.id]) {
      serverConfigs[message.guild.id] = {};
    }
    serverConfigs[message.guild.id].deafenedChannelId = channelId;
    saveConfig();
    message.reply(`Deafened channel set to <#${channelId}>`);
  }

  if (message.content.startsWith('!setNotificationChannel')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('You do not have permission to use this command.');
    }

    const channelId = message.content.split(' ')[1];
    if (!channelId) {
      return message.reply('Please provide a valid channel ID.');
    }

    if (!serverConfigs[message.guild.id]) {
      serverConfigs[message.guild.id] = {};
    }
    serverConfigs[message.guild.id].notificationChannelId = channelId;
    saveConfig();
    message.reply(`Notification channel set to <#${channelId}>`);
  }
});

// Voice state update event handler
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const serverConfig = serverConfigs[newState.guild.id];
  if (!serverConfig || !serverConfig.deafenedChannelId) return;

  const userId = newState.id;

  // Check if the user deafened themselves
  if (!oldState.selfDeaf && newState.selfDeaf) {
    console.log(`User ${newState.member.user.tag} deafened themselves.`);

    try {
      // Store the user's original channel
      userOriginalChannels.set(userId, oldState.channelId);

      // Move the user to the deafened channel
      await newState.member.voice.setChannel(serverConfig.deafenedChannelId);
      console.log(`Moved ${newState.member.user.tag} to the deafened channel.`);

      // Update the deafening count and timestamp
      const currentTime = Date.now();
      const userDeafeningData = userDeafeningCounts.get(userId) || { count: 0, timestamp: currentTime };
      if (currentTime - userDeafeningData.timestamp > 10000) {
        userDeafeningData.count = 0;
      }
      userDeafeningData.count += 1;
      userDeafeningData.timestamp = currentTime;
      userDeafeningCounts.set(userId, userDeafeningData);

      // Check if the user has exceeded the limit
      if (userDeafeningData.count > 5) {
        console.log(`User ${newState.member.user.tag} has exceeded the deafening limit.`);

        // Send a message to the notification channel
        const notificationChannelId = serverConfig.notificationChannelId;
        if (notificationChannelId) {
          const notificationChannel = newState.guild.channels.cache.get(notificationChannelId);
          if (notificationChannel && notificationChannel.type === 'GUILD_TEXT') {
            notificationChannel.send(`User ${newState.member.user.tag} has exceeded the deafening limit.`);
          }
        }
      }
    } catch (error) {
      console.error("Error moving user:", error);
    }
  }

  // Check if the user undeafened themselves
  if (oldState.selfDeaf && !newState.selfDeaf) {
    console.log(`User ${newState.member.user.tag} undeafened themselves.`);

    try {
      // Get the user's original channel
      const originalChannelId = userOriginalChannels.get(userId);

      // Move the user back to their original channel if it exists
      if (originalChannelId) {
        await newState.member.voice.setChannel(originalChannelId);
        console.log(`Moved ${newState.member.user.tag} back to their original channel.`);
        userOriginalChannels.delete(userId);
      }
    } catch (error) {
      console.error("Error moving user back to original channel:", error);
    }
  }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN);
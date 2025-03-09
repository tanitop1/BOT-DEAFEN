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

// Store the deafening counts and timestamps
const userDeafeningCounts = new Map();

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

// Command to set the user to disconnect when speaking
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!setcanalafk')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('No tenes permisos para usar este comando.');
    }

    const channelId = message.content.split(' ')[1];
    if (!channelId) {
      return message.reply('Poné una ID valida.');
    }

    if (!serverConfigs[message.guild.id]) {
      serverConfigs[message.guild.id] = {};
    }
    serverConfigs[message.guild.id].deafenedChannelId = channelId;
    saveConfig();
    message.reply(`Canal AFK seteado en <#${channelId}>`);
  }

  if (message.content.startsWith('!setNotificationChannel')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('No tenes permisos para usar este comando.');
    }

    const channelId = message.content.split(' ')[1];
    if (!channelId) {
      return message.reply('Poné una ID valida.');
    }

    if (!serverConfigs[message.guild.id]) {
      serverConfigs[message.guild.id] = {};
    }
    serverConfigs[message.guild.id].notificationChannelId = channelId;
    saveConfig();
    message.reply(`Canal de notificaciones seteado en <#${channelId}>`);
  }

  if (message.content.startsWith('!vincularusuario')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('No tenes permisos para usar este comando.');
    }

    const userId = message.content.split(' ')[1];
    if (!userId) {
      return message.reply('Poné una ID valida.');
    }

    if (!serverConfigs[message.guild.id]) {
      serverConfigs[message.guild.id] = {};
    }
    serverConfigs[message.guild.id].userToDisconnect = userId;
    saveConfig();
    message.reply(`Usuario a desconectar seteado con ID ${userId}`);
  }

  if (message.content.startsWith('!desvincularusuario')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('No tenes permisos para usar este comando.');
    }

    if (!serverConfigs[message.guild.id] || !serverConfigs[message.guild.id].userToDisconnect) {
      return message.reply('No hay ningún usuario configurado para desconectar.');
    }

    delete serverConfigs[message.guild.id].userToDisconnect;
    saveConfig();
    message.reply('Usuario a desconectar desconfigurado.');
  }

  if (message.content.startsWith('!Usuarioadesconectar')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('No tenes permisos para usar este comando.');
    }

    const userId = message.content.split(' ')[1];
    if (!userId) {
      return message.reply('Poné una ID valida.');
    }

    if (!serverConfigs[message.guild.id]) {
      serverConfigs[message.guild.id] = {};
    }
    serverConfigs[message.guild.id].userToDisconnectOnSpeak = userId;
    saveConfig();
    message.reply(`Usuario a desconectar al hablar seteado con ID ${userId}`);
  }

  if (message.content.startsWith('!desconfigurarusuario')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('No tenes permisos para usar este comando.');
    }

    if (!serverConfigs[message.guild.id] || !serverConfigs[message.guild.id].userToDisconnectOnSpeak) {
      return message.reply('No hay ningún usuario configurado para desconectar al hablar.');
    }

    delete serverConfigs[message.guild.id].userToDisconnectOnSpeak;
    saveConfig();
    message.reply('Usuario a desconectar al hablar desconfigurado.');
  }
});

// Voice state update event handler
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const serverConfig = serverConfigs[newState.guild.id];
  if (!serverConfig) return;

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
          if (notificationChannel && notificationChannel.isText()) {
            notificationChannel.send(`User ${newState.member.user.tag} has exceeded the deafening limit.`);
          } else {
            console.error(`Notification channel with ID ${notificationChannelId} is not a text channel.`);
          }
        } else {
          console.error(`Notification channel ID is not set for guild ${newState.guild.id}.`);
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

  // Check if the user started sharing their screen
  if (!oldState.streaming && newState.streaming) {
    const userToDisconnect = serverConfig.userToDisconnect;
    if (userToDisconnect && newState.id === userToDisconnect) {
      console.log(`User ${newState.member.user.tag} started sharing their screen. Disconnecting...`);
      try {
        await newState.disconnect();
        console.log(`Disconnected ${newState.member.user.tag} for sharing their screen.`);
      } catch (error) {
        console.error("Error disconnecting user:", error);
      }
    }
  }

  // Check if the user started speaking
  if (!oldState.speaking && newState.speaking) {
    const userToDisconnectOnSpeak = serverConfig.userToDisconnectOnSpeak;
    if (userToDisconnectOnSpeak && newState.id === userToDisconnectOnSpeak) {
      console.log(`User ${newState.member.user.tag} started speaking. Disconnecting...`);
      try {
        await newState.disconnect();
        console.log(`Disconnected ${newState.member.user.tag} for speaking.`);
      } catch (error) {
        console.error("Error disconnecting user:", error);
      }
    }
  }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN);
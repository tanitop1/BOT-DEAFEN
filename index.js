import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import { keepAlive } from './keep_alive.js';
keepAlive();

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Store the original channels of users
const userOriginalChannels = new Map();

// Store the configuration for each server
const serverConfigs = new Map();

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

    serverConfigs.set(message.guild.id, { deafenedChannelId: channelId });
    message.reply(`Deafened channel set to <#${channelId}>`);
  }
});

// Voice state update event handler
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const serverConfig = serverConfigs.get(newState.guild.id);
  if (!serverConfig || !serverConfig.deafenedChannelId) return;

  // Check if the user deafened themselves
  if (!oldState.selfDeaf && newState.selfDeaf) {
    console.log(`User ${newState.member.user.tag} deafened themselves.`);

    try {
      // Store the user's original channel
      userOriginalChannels.set(newState.id, oldState.channelId);

      // Move the user to the deafened channel
      await newState.member.voice.setChannel(serverConfig.deafenedChannelId);
      console.log(`Moved ${newState.member.user.tag} to the deafened channel.`);
    } catch (error) {
      console.error("Error moving user:", error);
    }
  }

  // Check if the user undeafened themselves
  if (oldState.selfDeaf && !newState.selfDeaf) {
    console.log(`User ${newState.member.user.tag} undeafened themselves.`);

    try {
      // Get the user's original channel
      const originalChannelId = userOriginalChannels.get(newState.id);

      // Move the user back to their original channel if it exists
      if (originalChannelId) {
        await newState.member.voice.setChannel(originalChannelId);
        console.log(`Moved ${newState.member.user.tag} back to their original channel.`);
        userOriginalChannels.delete(newState.id);
      }
    } catch (error) {
      console.error("Error moving user back to original channel:", error);
    }
  }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN);
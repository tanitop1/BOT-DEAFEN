import { Client, GatewayIntentBits, Events } from "discord.js"
import type { VercelRequest, VercelResponse } from "@vercel/node"

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

// Configuration (you can modify these values)
const CONFIG = {
  // The ID of the channel to move deafened users to
  deafenedChannelId: process.env.DEAFENED_CHANNEL_ID || "",
}

// Voice state update event handler
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // Check if the deafened channel is set
  if (!CONFIG.deafenedChannelId) return

  // Check if the user deafened themselves
  if (!oldState.selfDeaf && newState.selfDeaf) {
    console.log(`User ${newState.member.user.tag} deafened themselves.`)

    try {
      // Move the user to the deafened channel
      await newState.member.voice.setChannel(CONFIG.deafenedChannelId)
      console.log(`Moved ${newState.member.user.tag} to the deafened channel.`)
    } catch (error) {
      console.error("Error moving user:", error)
    }
  }
})

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This endpoint doesn't need to do anything, it's just to keep the bot alive
  res.status(200).json({ status: "Bot is running" })
}


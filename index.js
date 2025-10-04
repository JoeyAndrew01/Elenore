// - Imports 
const Discord = require("discord.js")
const express = require("express")
const path = require("path")
const fs = require("fs")
const eventHandler = require("./utils/eventHandler")
const dataAccess = require("./utils/dataAccess")


// -  Catch unhandled promise rejections globally 
process.on("unhandledRejection", (err) => {
    console.error("🧨 Unhandled Promise Rejection:", err)
})


// - Vars  & Configs
const app = express()
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent
    ]
})
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"))
for (const file of commandFiles) {
    const command = require(path.join(__dirname, "commands", file))
    if (!command?.data?.name || typeof command.execute !== "function") {
        console.warn(`⚠️ Skipping command "${file}" — missing data or execute method.`)
        continue
    }
    client.commands.set(command.data.name, command)
}
require("dotenv").config()


// - Logic — Messages
client.on("messageCreate", async message => {
    const serverId = message.guild?.id
    if (!serverId) return
    eventHandler.messageEventHandler(Discord, message, dataAccess.loadData(serverId))
})


// - Logic — Slash Commands
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return
    const command = client.commands.get(interaction.commandName)
    if (!command) return
    const guildId = interaction.guild?.id
    if (!guildId) return

    try {
        await command.execute(interaction, dataAccess.loadData(guildId))
    } catch (err) {
        console.error(err)
        await interaction.reply({
            content: "Error executing command.",
            flags: Discord.MessageFlags.Ephemeral
        })
    }
})


// - Deployment Related
app.listen(process.env.PORT, _ => console.log(`Bot server is running on port ${process.env.PORT}`))
app.get("/", (req, res) => res.send("Hello World. I'm a bot XD!"))
client.login(process.env.BOT_TOKEN)

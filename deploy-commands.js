// - Docs
// : `node deploy-commands.js`
// :  Slash commands must be registered with Discord’s servers before they appear in the UI


// - Imports
const fs = require("fs")
const path = require("path")
const { REST, Routes } = require("discord.js")
require("dotenv").config()


// - Vars
const commandFiles = fs.readdirSync(path.join(__dirname, "./commands")).filter(file => file.endsWith(".js"))
const commands = []
for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    commands.push(command.data.toJSON())
}


// - Main Logic
const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);  // : ASI (automatic semicolon insertion) error
(async () => {
    try {
        console.log("⏳ Refreshing slash commands...")

        // _ GUILD (local, fast)
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        )
        console.log("✅ Guild commands registered.")

        // _ (slower to appear)
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        )
        console.log("✅ Global commands registered.")
    } catch (error) {
        console.error("❌ Failed to register commands:", error)
    }
})()

// - Imports 
require("dotenv").config()  // : Cz outside main handler call objects can't access it in main file
const dataAccess = require("../utils/dataAccess")


// - Data
const embedMessageColors = {
    warning: 0xe62052,  // _ Red
    reminder: 0x2034e6,  // _ Blue
    warm: 0x00d084  // _ Green
}
const emotions = {
    love: {
        regex: /^i love you,? (eleonore|ele)$/i,
        creatorReply: process.env.CREATOR_LOVE_REPLY,
        userReply: process.env.USER_LOVE_REPLY
    },
    hate: {
        regex: /^i hate you,? (eleonore|ele)$/i,
        creatorReply: process.env.CREATOR_HATE_REPLY,
        userReply: process.env.USER_HATE_REPLY
    }
}



// - Helpers
const sendEmbedMessage = async (Discord, message, descriptionText, responseHeader, borderColor = embedMessageColors.warning) => {
    const embed = new Discord.EmbedBuilder()
    .setDescription(descriptionText)
    .setAuthor(responseHeader)
    .setColor(borderColor)
    await message.channel.send({ embeds: [embed] })
}
const executePrevention = async (Discord, message, responseHeader, fullForm, data) => {
    try {
        // _ [1] Delete rule-breaking message
        await message.delete()

        // _ [2] Build up warning text
        let warningText = ""
        let warningFormatted = ""
        if (fullForm !== "") {
            warningText = data.abbrWarning.replace(/\\n/g, "\n")
            warningFormatted = warningText.replace("<ABBREVIATION>", fullForm)
        } 
        else {
            warningText = data.dmWarning.replace(/\\n/g, "\n")
            warningFormatted = warningText
        }
        

        // _ [3] Send warning message
        await sendEmbedMessage(Discord, message, warningFormatted, responseHeader)
    } catch (err) {
        console.error("Failed to delete or warn:", err)
    }
}



// - Main Handler
exports.messageEventHandler = async (Discord, message, data) => {
    // _ [_] Prevent potential overlap
    if (message.author.bot) return

    // _ [0] Get message content & Build response header
    const messageContent = message.content.toLowerCase()
    const responseHeader = {
        name: message.member?.displayName || message.author.username,
        iconURL: message.author.displayAvatarURL()
    }

    // _ [1] Prevent DM Declarations
    const dmRegex = new RegExp(`\\bdms?\\b`, "i")
    if (dmRegex.test(messageContent)) {
        await executePrevention(Discord, message, responseHeader, "", data)
        return
    }

    // _ [2] "I love/ hate you, Eleonore"
    for (const [, emotion] of Object.entries(emotions)) {
        if (emotion.regex.test(message.content.trim())) {
            const isCreator = message.author.username === process.env.CREATOR_USERNAME
            let reply = (isCreator ? emotion.creatorReply : emotion.userReply).replace(/\\n/g, "\n")

            if (!isCreator) {
                const name = message.member?.displayName || message.author.username
                reply = reply.replace("<USER>", name)
            }

            await sendEmbedMessage(Discord, message, reply, responseHeader, embedMessageColors.warm)
            return
        }
    }

    // _ [3] Prevent Abbreviations (Last check due to operation Intensity)
    try {
        // ; const serverId = message.guild?.id
        const channelId = message.channel.id
    
        let excludedChannels = data.excludes.abbreviations || []
    
        if (!excludedChannels.includes(channelId)) {
            for (const [abbr, fullForm] of Object.entries(data.abbreviations)) {
                const abbrRegex = new RegExp(`\\b${abbr}\\b`, "i")
                if (abbrRegex.test(messageContent)) {
                    await executePrevention(Discord, message, responseHeader, fullForm, data)
                    await dataAccess.editWarnCounts(data.warnCountsPath, data.warnCounts, "abbr", "increaseByOne", message.author.id)
                    break // : Only respond to the first found abbreviation
                }
            }
        }
    } catch (err) {
        console.error("Error checking excludes.json:", err)
    }
}

// - Imports
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ChannelType
} = require("discord.js")
const dataAccess = require("../utils/dataAccess")


// - Logic Wrapper
module.exports = {
    // _ (1) Commands Exporting
    data: new SlashCommandBuilder()
        .setName("abbreviations").setDescription("Manage abbreviation rules")
        .addSubcommand(sub =>
            sub.setName("show").setDescription("Show all abbreviations")
        )
        .addSubcommand(sub =>
            sub.setName("add").setDescription("Add a new abbreviation")
                .addStringOption(opt =>
                    opt.setName("abbreviation").setDescription("The abbreviation").setRequired(true))
                .addStringOption(opt =>
                    opt.setName("fullform").setDescription("The full form").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("remove").setDescription("Remove an abbreviation")
                .addStringOption(opt =>
                    opt.setName("abbreviation").setDescription("The abbreviation").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("check").setDescription("Look up an abbreviation")
                .addStringOption(opt =>
                    opt.setName("abbreviation").setDescription("The abbreviation").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("excludes_add").setDescription("Exclude abbreviation checks in a channel")
                .addChannelOption(opt =>
                    opt.setName("channel").setDescription("Channel to exclude").addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("excludes_show").setDescription("Show excluded channels for abbreviation filtering"))
        .addSubcommand(sub =>
            sub.setName("excludes_remove").setDescription("Remove exclusion for a channel")
                .addChannelOption(opt =>
                    opt.setName("channel").setDescription("Channel to re-include").addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("custom_warning")
                .setDescription("Customize warning messages")
                // .addStringOption(opt =>
                //     opt.setName("type")
                //         .setDescription("Which warning to update.")
                //         .setRequired(true)
                //         .addChoices(
                //             { name: "DM", value: "dmWarning" },
                //             { name: "Abbreviation", value: "abbrWarning" }
                //         )
                // )
                .addStringOption(opt =>
                    opt.setName("message")
                        .setDescription("The new warning message.")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("warns_count_show_all")
                .setDescription("Show all user abbreviation warnings")
        )
        .addSubcommand(sub =>
            sub.setName("warns_count_show_user")
                .setDescription("Show a specific user's abbreviation warnings")
                .addUserOption(opt =>
                    opt.setName("user")
                        .setDescription("User to check")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("warns_count_edit_user")
                .setDescription("Edit a user's abbreviation warnings")
                .addUserOption(opt =>
                    opt.setName("user")
                        .setDescription("User to edit")
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName("count")
                        .setDescription("New warn count")
                        .setRequired(true)
                )
        ),



    async execute(interaction, data) {
        // _ (2) Limit to Mods
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: "🚫 You don’t have permission to use this command.",
                flags: MessageFlags.Ephemeral
            })
        }

        // _ (3) Watch Sub Commands
        const sub = interaction.options.getSubcommand()
        const handlers = {
            show: handleShow,
            add: handleAdd,
            remove: handleRemove,
            check: handleCheck,
            excludes_show: handleExcludeShow,
            excludes_add: handleExcludeAdd,
            excludes_remove: handleExcludeRemove,
            custom_warning:handleCustomMsgs,
            warns_count_show_all: handleWarnsCountShowAll,
            warns_count_show_user: handleWarnsCountShowUser,
            warns_count_edit_user: handleWarnsCountEditUser
        }
        const handler = handlers[sub]
        if (handler) return handler(interaction, data)
        return interaction.reply({ content: "❓ Unknown subcommand." })
    }
}


// - Sub Commands Handlers
const handleShow = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Check abbr file is not empty
    const entries = Object.entries(data.abbreviations)
    if (entries.length === 0) {
        return interaction.editReply({content: "⭕ No abbreviations found. File empty"}).catch(console.error)
    }


    // _ (2) Abbreviations Pages Presentation
    const perPage = 20
    let page = 0
    const totalPages = Math.ceil(entries.length / perPage)
    const generateEmbed = (pageIndex) => {
        const chunk = entries.slice(pageIndex * perPage, (pageIndex + 1) * perPage)
        return new EmbedBuilder()
            .setTitle("📚 Abbreviations List")
            .setDescription(
                chunk.map(([abbr, full], i) =>
                `**${page * 20 + i + 1}.** **${abbr}** → ${full}`
                ).join("\n")
            )
            .setFooter({ text: `Page ${pageIndex + 1} of ${totalPages}` })
            .setColor(0x00bfff)
    }


    // _ (3) Abbreviations Pages Control
    const getRow = (disabled = false) =>
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("prev_abbr_page")
                .setLabel("◀️ Previous")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === 0),
            new ButtonBuilder()
                .setCustomId("next_abbr_page")
                .setLabel("Next ▶️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === totalPages - 1)
        )


    // _ (4) Send Output — pages & their controls
    const message = await interaction.editReply({
        embeds: [generateEmbed(page)],
        components: [getRow()],
        fetchReply: true  // : get msg obj that was sent
    })


    // _ (5) Create listener for button clicks (Pages Controls)
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,  // : Only the user who ran the command
        time: 6e4  // : automatically stopping after 60 sec
    })


    // _ (6) Update Output — on interaction with controls
    collector.on("collect", async (btnInt) => {  // : btnInt → "Button Interaction"
        if (btnInt.customId === "prev_abbr_page") {
            page = Math.max(0, page - 1)
        } else if (btnInt.customId === "next_abbr_page") {
            page = Math.min(totalPages - 1, page + 1)
        }

        try {
            await btnInt.update({
                embeds: [generateEmbed(page)],
                components: [getRow()]
            })
        } catch (err) {
            btnInt.editReply({content: "❌ Failed to load abbreviations file."}).catch(console.error)
        }
    })


    // _ (7) Disable buttons after collector (listenor) time runs out
    collector.on("end", () => {
        message.edit({ components: [getRow(true)] }).catch(console.error)
    })
}
const handleAdd = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Nested Vars
    const abbrKey = interaction.options.getString("abbreviation").toUpperCase()
    const abbrFullForm = interaction.options.getString("fullform")


    // _ (2) Already exists?
    if (data.abbreviations[abbrKey]) {
      return interaction.editReply({ content: `⚠️ Abbreviation **${abbrKey}** already exists` })
    }


	// _ (3) Add abbreviation
    await dataAccess.editAbbreviations(data.abbrPath, data.abbreviations, abbrKey, abbrFullForm)


	// _ (4) Send reply
    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
            .setTitle("✅ Abbreviation Added")
            .setDescription(`**${abbrKey}** → ${abbrFullForm}`)
            .setColor(0x00cc66)
		]
    })
}
const handleRemove = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Nested Var(s)
    const abbrKey = interaction.options.getString("abbreviation").toUpperCase()


    // _ (2) Doesn't exist?
    if (!data.abbreviations[abbrKey]) {
        return interaction.editReply({ content: `⚠️ Abbreviation **${abbrKey}** not found.` })
    }


	// _ (3) Remove abbreviation
    await dataAccess.editAbbreviations(data.abbrPath, data.abbreviations, abbrKey, "DELETE")


	// _ (4) Send reply
    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle("🗑 Abbreviation Removed")
                .setDescription(`**${abbrKey}** has been deleted.`)
                .setColor(0xff5050)
        ]
    })
}
const handleCheck = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Nested Var(s)
    const abbrKey = interaction.options.getString("abbreviation").toUpperCase()


    // _ (2) Send reply
    if (!data.abbreviations[abbrKey]) {
        return interaction.editReply({ content: `🔴 Abbreviation **${abbrKey}** doesn't exist` })
    } else {
        return interaction.editReply({ content: `🟢 Abbreviation **${abbrKey}** exists.` })
    }
}
const handleExcludeShow = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Nested Vars
    const channels = data.excludes.abbreviations.map(id => `<#${id}>`)
    const reply = channels.length ? channels.join("\n") : "⭕ No excluded channels found."

    // _ (2) Functionality
    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
            .setTitle("📤 Excluded Channels")
            .setDescription(reply)
            .setColor(0xff9900)
        ]
    })
}
const handleExcludeAdd = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Nested Vars
    const channel = interaction.options.getChannel("channel")



    // _ (2) Functionality
    if (!data.excludes.abbreviations.includes(channel.id)) {
        data.excludes.abbreviations.push(channel.id)
        await dataAccess.editExcludes(data.excludesPath, data.excludes)
        return interaction.editReply(`✅ Channel <#${channel.id}> added to abbreviation exclusions.`)
    } else {
        return interaction.editReply(`⚠️ Channel <#${channel.id}> is already excluded.`)
    }
}
const handleExcludeRemove = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    // _ (1) Nested Vars
    const channel = interaction.options.getChannel("channel")

    
    // _ (2) Functionality
    if (data.excludes.abbreviations.includes(channel.id)) {
        data.excludes.abbreviations = data.excludes.abbreviations.filter(id => id !== channel.id)
        await dataAccess.editExcludes(data.excludesPath, data.excludes)
        return interaction.editReply(`♻️ Channel <#${channel.id}> has been removed from exclusions.`)
    } else {
        return interaction.editReply(`❌ Channel <#${channel.id}> is not excluded.`)
    }
}
const handleCustomMsgs = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()
    

    // _ (1) Nested Vars
    // const warningType = interaction.options.getString("type")
    const warningType = "abbrWarning"
    const newMessage = interaction.options.getString("message")


    // _ (2) Functionality
    data.customMsgs[warningType] = newMessage
    try {
        await dataAccess.editCustomMsgs(data.customMsgsPath, data.customMsgs)
        return interaction.editReply(`✅ Updated **${warningType}** to:\n\`\`\`\n${newMessage}\n\`\`\``)
    } catch (err) {
        console.error("❌ Failed to update custom message:", err)
        return interaction.editReply("❌ Failed to save custom warning message.")
    }
}
const handleWarnsCountShowAll = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    try {
        // _ (1) Format List  in Descending Order + Validation
        const entries = Object.entries(data.warnCounts["abbr"])
        if (entries.length === 0) {
            return interaction.editReply("⭕ No warning records found.")
        }
        const sorted = entries.sort((a, b) => b[1] - a[1])
        const list = await Promise.all(
            sorted.map(async ([id, count], index) => {
                try {
                    const member = await interaction.guild.members.fetch(id)
                    return `${index + 1}) **${member.displayName} (${member.user.tag})** → ${count}`
                } catch {
                    return `${index + 1}) **Unexisting user (${id})** → ${count}`
                }
            })
        )


        // _ (2) Send reply
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📛 Abbreviation Warning Counts")
                    .setDescription(list.join("\n"))
                    .setColor(0xe62052),
            ],
        })


    // _ (3) Error Handling
    } catch (err) {
        console.error("Error in warns_count_show_all:", err)
        return interaction.editReply("❌ Failed to fetch warn counts due to an internal error.")
    }
}
const handleWarnsCountShowUser = async (interaction, data) => {
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    try {
        // _ (1) Nested Vars + Validation
        const user = interaction.options.getUser("user")
        if (!user) {
            return interaction.editReply("❌ Please select a user.")
        }
        const count = data.warnCounts.abbr[user.id] || 0


        // _ (2) Send reply
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📛 Abbreviation Warning Lookup")
                    .setDescription(
                        `✶ **${user.displayName ?? user.username} (${user.tag})** → **${count}**`
                    )
                    .setColor(count === 0 ? 0x57F287 : 0xe62052)
            ],
            allowedMentions: { parse: [] }
        })


    // _ (3) Error Handling
    } catch (err) {
        console.error("Error in warns_count_show_user:", err)
        return interaction.editReply("❌ Failed to fetch user warn count due to an internal error.")
    }
}
const handleWarnsCountEditUser = async (interaction, data) => { 
    // _ (0) "Discord, gimme more than 3 seconds"
    await interaction.deferReply()


    try {
        // _ (1) Nested Vars
        const user = interaction.options.getUser("user")
        const countValue = interaction.options.getInteger("count")


        // _ (2) Validate user
        if (!user) {
            return interaction.editReply({ content: "❌ Please select a user." })
        }
        const displayName = user.username


        // _ (3) Validate count
        if (typeof countValue !== "number" || countValue < 0) {
            return interaction.editReply({ content: "⚠️ Please provide a valid non-negative integer for `count`." })
        }
        // : would add a value checker first but that would be pointless 2 operations


        // _ (4) Update warn count
        await dataAccess.editWarnCounts(data.warnCountsPath, data.warnCounts, "abbr", countValue, user.id)


        // _ (5) Send reply (confirmation)
        return interaction.editReply({
            content: `✅ Updated **${displayName}**'s warn count to **${countValue}**.`,
            allowedMentions: { parse: [] }
        })


    // _ (6) Error Handling
    } catch (err) {
        console.error("Error in warns_count_edit_user:", err)
        return interaction.editReply({ content: "❌ Failed to update warn count due to an internal error." })
    }
}

// - Imports
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require("discord.js")


// - Logic Wrapper
module.exports = {
    // _ (1) Commands Exporting
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("See what you & I can do!"),
        
        async execute(interaction) {
        // _ (2) "Discord, gimme more than 3 seconds"
        await interaction.deferReply()

        // _ (3) Nested Vars
        const commands = await interaction.client.application.commands.fetch()

        // _ (4) Get Commands Refs
        const getCmdRef = (name, sub) => {
            const cmd = commands.find(c => c.name === name)
            if (!cmd) return `\`${name} ${sub}\``
            const subcmd = cmd.options.find(opt => opt.name === sub)
            if (!subcmd) return `\`${name} ${sub}\``
            return `</${name} ${sub}:${cmd.id}>`
        }

        // _ (5) Embeds for each category
        const embeds = {
            abbreviations: new EmbedBuilder()
                .setColor(0xe91e63)
                .setTitle("📚 Abbreviations Commands")
                .setDescription([
                    getCmdRef("abbreviations", "show"),
                    getCmdRef("abbreviations", "check"),
                    getCmdRef("abbreviations", "add"),
                    getCmdRef("abbreviations", "remove"),
                    getCmdRef("abbreviations", "excludes_show"),
                    getCmdRef("abbreviations", "excludes_add"),
                    getCmdRef("abbreviations", "excludes_remove"),
                    getCmdRef("abbreviations", "custom_warning") + " + <ABBREVIATION>",
                    getCmdRef("abbreviations", "warns_count_show_all"),
                    getCmdRef("abbreviations", "warns_count_show_user"),
                    getCmdRef("abbreviations", "warns_count_edit_user")
                ]
                .map((cmd, i) => `${i + 1}. ${cmd}`)
                .join("\n")),

            dms: new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle("💬 DMs")
                .setDescription("*WIP*"),

            emotions: new EmbedBuilder()
                .setColor(0x77dd77)
                .setTitle("💚 Emotions")
                .setDescription("*WIP*")
        }

        // _ (6) Dropdown Menu
        const menu = new StringSelectMenuBuilder()
            .setCustomId("help_menu")
            .setPlaceholder("Choose a category")
            .addOptions([
                {
                    label: "Abbreviations",
                    value: "abbreviations",
                    emoji: "📚"
                },
                {
                    label: "DMs",
                    value: "dms",
                    emoji: "💬"
                },
                {
                    label: "Emotions",
                    value: "emotions",
                    emoji: "💚"
                }
            ])
        const row = new ActionRowBuilder().addComponents(menu)

        // _ (7) Send Output
        const message = await interaction.editReply({
            embeds: [embeds.abbreviations],
            components: [row],
            fetchReply: true
        })

        // _ (8) Create listener 
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60_000
        })

        // _ (9) Update Output
        collector.on("collect", async i => {
            const selected = i.values[0];
            await i.update({
                embeds: [embeds[selected]],
                components: [row]
            })
        })

        // _ (10) Disable after time runs out
        // collector.on("end", () => {
        //     message.edit({ components: [] }).catch(console.error)
        // })
    }
}

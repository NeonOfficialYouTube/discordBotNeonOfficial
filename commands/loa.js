const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestloa')
        .setDescription('Request a Leave Of Absence')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for leave')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days off (max 20)')
                .setRequired(true)
                .setMaxValue(20)),
    async execute(interaction) {
        const reason = interaction.options.getString('reason');
        const days = interaction.options.getInteger('days');

        const channel = interaction.guild.channels.cache.get(config.channels.loaRequests);
        if (!channel) return interaction.reply({ content: 'LOA request channel not found.', ephemeral: true });

        const requesterId = interaction.user.id;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`loa-yes-${requesterId}`)
                    .setLabel('YES')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`loa-no-${requesterId}`)
                    .setLabel('NO')
                    .setStyle(ButtonStyle.Danger)
            );

        const embed = new EmbedBuilder()
            .setTitle('Leave Of Absence Request')
            .addFields(
                { name: 'Player', value: interaction.user.tag, inline: true },
                { name: 'Days', value: `${days}`, inline: true },
                { name: 'Reason', value: reason }
            )
            .setColor(0x00FFFF)
            .setTimestamp();

        const message = await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Your LOA request has been sent!', ephemeral: true });
    }
};

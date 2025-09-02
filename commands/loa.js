const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestloa')
        .setDescription('Request a Leave of Absence (LOA)')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for LOA')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days (max 20)')
                .setRequired(true)),

    async execute(interaction) {
        const reason = interaction.options.getString('reason');
        const days = interaction.options.getInteger('days');

        // enforce 20-day limit
        if (days > 20) {
            return interaction.reply({ content: '🚫 LOA cannot be longer than **20 days**.', ephemeral: true });
        }

        // Channel where LOA requests go
        const loaChannelId = '1412198885312430180'; // replace with channel ID like "123456789"
        const loaChannel = interaction.client.channels.cache.get(loaChannelId);

        if (!loaChannel) {
            return interaction.reply({ content: '⚠️ Could not find the LOA requests channel.', ephemeral: true });
        }

        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle('📌 New Leave of Absence Request')
            .setColor(0xFFD700)
            .addFields(
                { name: 'Staff Member', value: `${interaction.user.tag}`, inline: true },
                { name: 'Days Requested', value: `${days}`, inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        // Approve/deny buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_${interaction.user.id}`)
                .setLabel('✅ Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`deny_${interaction.user.id}`)
                .setLabel('❌ Deny')
                .setStyle(ButtonStyle.Danger)
        );

        await loaChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Your LOA request has been submitted for review.', ephemeral: true });
    }
};

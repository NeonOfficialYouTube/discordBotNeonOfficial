const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('loa-yes')
                    .setLabel('YES')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('loa-no')
                    .setLabel('NO')
                    .setStyle(ButtonStyle.Danger)
            );

        const message = await channel.send({
            content: `New LOA request from <@${interaction.user.id}>`,
            embeds: [{
                title: 'Leave Of Absence Request',
                fields: [
                    { name: 'Player', value: interaction.user.tag, inline: true },
                    { name: 'Days', value: `${days}`, inline: true },
                    { name: 'Reason', value: reason }
                ],
                color: 0x00FFFF,
                timestamp: new Date()
            }],
            components: [row]
        });

        await interaction.reply({ content: 'Your LOA request has been sent!', ephemeral: true });

        // Only allow you and Johnny to approve/deny
        const allowedUsers = ['1345050725637685288', '1320938370586902609']; // replace with actual Discord IDs

        const collector = message.createMessageComponentCollector({
            filter: i => allowedUsers.includes(i.user.id),
            componentType: 'BUTTON',
            time: 86400000 // 24 hours
        });

        collector.on('collect', async i => {
            if (i.customId === 'loa-yes') {
                const loaRole = interaction.guild.roles.cache.find(r => r.name === 'Leave Of Absence');
                if (loaRole) {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await member.roles.add(loaRole);
                    await i.user.send(`${interaction.user.tag}'s LOA request has been approved.`);
                    await interaction.user.send('Your Leave Of Absence has been approved!');
                }
                await i.update({ content: 'LOA approved ✅', components: [] });
            } else if (i.customId === 'loa-no') {
                await interaction.user.send('Your Leave Of Absence request was not approved.');
                await i.update({ content: 'LOA denied ❌', components: [] });
            }
        });
    }
};

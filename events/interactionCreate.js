const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Get verified in the server'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const embed = new EmbedBuilder()
            .setTitle('✅ Server Verification')
            .setDescription('Press the button below to get verified and gain access to the server.')
            .setColor(config.embedColor);

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_${userId}`)
                    .setLabel('VERIFY')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttonRow],
            ephemeral: true // Only the user sees the message
        });
    }
};

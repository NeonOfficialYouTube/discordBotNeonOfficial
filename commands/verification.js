const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Get the verification embed to verify yourself'),

    async execute(interaction) {
        try {
            const verifyEmbed = new EmbedBuilder()
                .setTitle('✅ Verification')
                .setDescription('Click the button below to get verified and receive the Verified role!')
                .setColor(config.embedColor)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('discord_verify')
                        .setLabel('VERIFY')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                );

            await interaction.reply({
                embeds: [verifyEmbed],
                components: [row],
                ephemeral: true // only the user sees this reply
            });

        } catch (error) {
            console.error('Error sending verification embed:', error);
            await interaction.reply({
                content: '❌ An error occurred while sending the verification embed.',
                ephemeral: true
            });
        }
    }
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('../utils/logger');
const { checkCooldown, setCooldown } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion to the community')
        .addStringOption(option =>
            option.setName('suggestion')
                .setDescription('Your suggestion')
                .setRequired(true)
                .setMaxLength(1000)),
    
    async execute(interaction) {
        try {
            const suggestion = interaction.options.getString('suggestion');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            
            // Check cooldown
            const cooldownCheck = await checkCooldown(userId, 'suggestion', config.cooldowns.suggestion);
            if (!cooldownCheck.canExecute) {
                const timeLeft = Math.ceil(cooldownCheck.timeLeft / 1000 / 60);
                return interaction.reply({
                    content: `⏰ You can submit another suggestion in ${timeLeft} minutes.`,
                    ephemeral: true
                });
            }
            
            const db = getDatabase();
            
            // Insert suggestion into database
            const result = await db.run(
                'INSERT INTO suggestions (user_id, guild_id, suggestion) VALUES (?, ?, ?)',
                [userId, guildId, suggestion]
            );
            
            // Set cooldown
            await setCooldown(userId, 'suggestion', config.cooldowns.suggestion, guildId);
            
            // Create suggestion embed
            const suggestionEmbed = new EmbedBuilder()
                .setTitle('📝 New Suggestion')
                .setDescription(suggestion)
                .setAuthor({
                    name: interaction.user.displayName,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setColor(config.embedColor)
                .setFooter({ text: `Suggestion ID: ${result.lastID}` })
                .setTimestamp();
            
            // Create voting buttons
            const voteRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_upvote_${result.lastID}`)
                        .setLabel('👍 Upvote')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_downvote_${result.lastID}`)
                        .setLabel('👎 Downvote')
                        .setStyle(ButtonStyle.Danger)
                );
            
            // Send to suggestions channel only
            if (!config.channels.suggestions) {
                return interaction.reply({
                    content: '❌ No suggestions channel has been configured. Please ask an admin to set up a suggestions channel first.',
                    ephemeral: true
                });
            }
            
            const suggestionsChannel = interaction.guild.channels.cache.get(config.channels.suggestions);
            if (!suggestionsChannel) {
                return interaction.reply({
                    content: '❌ The configured suggestions channel was not found. Please ask an admin to update the channel settings.',
                    ephemeral: true
                });
            }
            
            await suggestionsChannel.send({
                embeds: [suggestionEmbed],
                components: [voteRow]
            });
            
            await interaction.reply({
                content: '✅ Your suggestion has been submitted successfully!',
                ephemeral: true
            });
            
            logger.info(`Suggestion submitted by ${interaction.user.tag} (${userId}): ${suggestion}`);
            
        } catch (error) {
            logger.error('Error in suggest command:', error);
            await interaction.reply({
                content: '❌ An error occurred while submitting your suggestion. Please try again later.',
                ephemeral: true
            });
        }
    }
};

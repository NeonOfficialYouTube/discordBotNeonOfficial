const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');
const { hasPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a custom embed message')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title of the embed')
                .setRequired(true)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description/content of the embed')
                .setRequired(true)
                .setMaxLength(4000))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Hex color code (e.g., #FF0000 for red)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text')
                .setRequired(false)
                .setMaxLength(2048))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the embed to (defaults to current channel)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('URL for thumbnail image')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL for main image')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            // Check permissions - only admins/moderators can use this command
            if (!hasPermission(interaction.member, 'moderator')) {
                return interaction.reply({
                    content: '❌ You do not have permission to use the embed command.',
                    ephemeral: true
                });
            }
            
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || config.embedColor;
            const footer = interaction.options.getString('footer');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');
            
            // Validate color format
            let embedColor = color;
            if (color && color.startsWith('#')) {
                // Remove # and validate hex
                const hexColor = color.slice(1);
                if (!/^[0-9A-F]{6}$/i.test(hexColor)) {
                    return interaction.reply({
                        content: '❌ Invalid color format. Please use hex format like #FF0000',
                        ephemeral: true
                    });
                }
                embedColor = parseInt(hexColor, 16);
            }
            
            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(embedColor)
                .setTimestamp();
            
            // Add optional elements
            if (footer) {
                embed.setFooter({ text: footer });
            }
            
            if (thumbnail) {
                try {
                    embed.setThumbnail(thumbnail);
                } catch (error) {
                    return interaction.reply({
                        content: '❌ Invalid thumbnail URL provided.',
                        ephemeral: true
                    });
                }
            }
            
            if (image) {
                try {
                    embed.setImage(image);
                } catch (error) {
                    return interaction.reply({
                        content: '❌ Invalid image URL provided.',
                        ephemeral: true
                    });
                }
            }
            
            // Check if target channel exists and bot has permissions
            if (!targetChannel) {
                return interaction.reply({
                    content: '❌ Target channel not found.',
                    ephemeral: true
                });
            }
            
            if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({
                    content: '❌ I do not have permission to send messages in that channel.',
                    ephemeral: true
                });
            }
            
            // Send embed to target channel
            await targetChannel.send({ embeds: [embed] });
            
            // Confirm to user
            const channelMention = targetChannel.id === interaction.channel.id ? 'this channel' : `<#${targetChannel.id}>`;
            await interaction.reply({
                content: `✅ Embed sent successfully to ${channelMention}!`,
                ephemeral: true
            });
            
            logger.info(`${interaction.user.tag} sent an embed titled "${title}" to ${targetChannel.name}`);
            
        } catch (error) {
            logger.error('Error in embed command:', error);
            await interaction.reply({
                content: '❌ An error occurred while sending the embed.',
                ephemeral: true
            });
        }
    }
};

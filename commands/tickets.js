const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('../utils/logger');
const { checkCooldown, setCooldown, hasPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a support ticket')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Category of your ticket')
                        .setRequired(true)
                        .addChoices(
                            { name: 'General Support', value: 'general' },
                            { name: 'Bug Report', value: 'bug' },
                            { name: 'Feature Request', value: 'feature' },
                            { name: 'Appeal', value: 'appeal' },
                            { name: 'Other', value: 'other' }
                        ))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Brief description of your issue')
                        .setRequired(true)
                        .setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true))),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const db = getDatabase();
            
            switch (subcommand) {
                case 'create':
                    await handleCreateTicket(interaction, db);
                    break;
                case 'close':
                    await handleCloseTicket(interaction, db);
                    break;
                case 'add':
                    await handleAddUser(interaction, db);
                    break;
                case 'remove':
                    await handleRemoveUser(interaction, db);
                    break;
            }
            
        } catch (error) {
            logger.error('Error in ticket command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the ticket command.',
                ephemeral: true
            });
        }
    }
};

async function handleCreateTicket(interaction, db) {
    const category = interaction.options.getString('category');
    const description = interaction.options.getString('description');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    // Check cooldown
    const cooldownCheck = await checkCooldown(userId, 'ticket', config.cooldowns.ticket);
    if (!cooldownCheck.canExecute) {
        const timeLeft = Math.ceil(cooldownCheck.timeLeft / 1000 / 60);
        return interaction.reply({
            content: `⏰ You can create another ticket in ${timeLeft} minutes.`,
            ephemeral: true
        });
    }
    
    // Check if user already has an open ticket
    const existingTicket = await db.get(
        'SELECT * FROM tickets WHERE user_id = ? AND guild_id = ? AND status = "open"',
        [userId, guildId]
    );
    
    if (existingTicket) {
        return interaction.reply({
            content: '❌ You already have an open ticket. Please close your current ticket before creating a new one.',
            ephemeral: true
        });
    }
    
    // Generate unique ticket ID
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
            name: `${category}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ],
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ],
                }
            ]
        });
        
        // Add admin/moderator permissions
        if (config.roles.admin) {
            await ticketChannel.permissionOverwrites.create(config.roles.admin, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }
        
        if (config.roles.moderator) {
            await ticketChannel.permissionOverwrites.create(config.roles.moderator, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }
        
        // Insert ticket into database
        await db.run(
            'INSERT INTO tickets (ticket_id, user_id, guild_id, channel_id, category) VALUES (?, ?, ?, ?, ?)',
            [ticketId, userId, guildId, ticketChannel.id, category]
        );
        
        // Set cooldown
        await setCooldown(userId, 'ticket', config.cooldowns.ticket, guildId);
        
        // Create ticket embed
        const ticketEmbed = new EmbedBuilder()
            .setTitle('🎫 Support Ticket Created')
            .setDescription(`**Category:** ${getCategoryDisplayName(category)}\n**Description:** ${description}`)
            .addFields(
                { name: 'Ticket ID', value: ticketId, inline: true },
                { name: 'Created by', value: `<@${userId}>`, inline: true },
                { name: 'Status', value: '🟢 Open', inline: true }
            )
            .setColor(config.embedColor)
            .setTimestamp();
        
        // Create ticket control buttons
        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_close_${ticketId}`)
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );
        
        // Send initial message to ticket channel
        await ticketChannel.send({
            content: `<@${userId}> Welcome to your support ticket!`,
            embeds: [ticketEmbed],
            components: [controlRow]
        });
        
        await interaction.reply({
            content: `✅ Ticket created successfully! Please check <#${ticketChannel.id}>`,
            ephemeral: true
        });
        
        logger.info(`Ticket ${ticketId} created by ${interaction.user.tag} (${userId})`);
        
    } catch (error) {
        logger.error('Failed to create ticket channel:', error);
        await interaction.reply({
            content: '❌ Failed to create ticket channel. Please contact an administrator.',
            ephemeral: true
        });
    }
}

async function handleCloseTicket(interaction, db) {
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    // Check if this is a ticket channel
    const ticket = await db.get(
        'SELECT * FROM tickets WHERE channel_id = ? AND guild_id = ? AND status = "open"',
        [channelId, guildId]
    );
    
    if (!ticket) {
        return interaction.reply({
            content: '❌ This is not a ticket channel or the ticket is already closed.',
            ephemeral: true
        });
    }
    
    // Check if user has permission to close ticket
    const canClose = ticket.user_id === userId || hasPermission(interaction.member, 'moderator');
    
    if (!canClose) {
        return interaction.reply({
            content: '❌ You do not have permission to close this ticket.',
            ephemeral: true
        });
    }
    
    try {
        // Update ticket status in database
        await db.run(
            'UPDATE tickets SET status = "closed", closed_at = CURRENT_TIMESTAMP, closed_by = ? WHERE ticket_id = ?',
            [userId, ticket.ticket_id]
        );
        
        // Create closure embed
        const closureEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(`This ticket has been closed by <@${userId}>`)
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [closureEmbed] });
        
        // Delete channel after a delay
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                logger.error('Failed to delete ticket channel:', error);
            }
        }, 10000); // 10 second delay
        
        logger.info(`Ticket ${ticket.ticket_id} closed by ${interaction.user.tag} (${userId})`);
        
    } catch (error) {
        logger.error('Failed to close ticket:', error);
        await interaction.reply({
            content: '❌ Failed to close ticket.',
            ephemeral: true
        });
    }
}

async function handleAddUser(interaction, db) {
    const targetUser = interaction.options.getUser('user');
    const channelId = interaction.channel.id;
    const guildId = interaction.guild.id;
    
    // Check if this is a ticket channel
    const ticket = await db.get(
        'SELECT * FROM tickets WHERE channel_id = ? AND guild_id = ? AND status = "open"',
        [channelId, guildId]
    );
    
    if (!ticket) {
        return interaction.reply({
            content: '❌ This is not a ticket channel.',
            ephemeral: true
        });
    }
    
    // Check permissions
    if (!hasPermission(interaction.member, 'moderator')) {
        return interaction.reply({
            content: '❌ You do not have permission to add users to tickets.',
            ephemeral: true
        });
    }
    
    try {
        // Add user permissions to channel
        await interaction.channel.permissionOverwrites.create(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        
        await interaction.reply({
            content: `✅ Added <@${targetUser.id}> to the ticket.`,
            ephemeral: true
        });
        
        logger.info(`${targetUser.tag} added to ticket ${ticket.ticket_id} by ${interaction.user.tag}`);
        
    } catch (error) {
        logger.error('Failed to add user to ticket:', error);
        await interaction.reply({
            content: '❌ Failed to add user to ticket.',
            ephemeral: true
        });
    }
}

async function handleRemoveUser(interaction, db) {
    const targetUser = interaction.options.getUser('user');
    const channelId = interaction.channel.id;
    const guildId = interaction.guild.id;
    
    // Check if this is a ticket channel
    const ticket = await db.get(
        'SELECT * FROM tickets WHERE channel_id = ? AND guild_id = ? AND status = "open"',
        [channelId, guildId]
    );
    
    if (!ticket) {
        return interaction.reply({
            content: '❌ This is not a ticket channel.',
            ephemeral: true
        });
    }
    
    // Check permissions
    if (!hasPermission(interaction.member, 'moderator')) {
        return interaction.reply({
            content: '❌ You do not have permission to remove users from tickets.',
            ephemeral: true
        });
    }
    
    // Prevent removing ticket owner
    if (targetUser.id === ticket.user_id) {
        return interaction.reply({
            content: '❌ Cannot remove the ticket owner.',
            ephemeral: true
        });
    }
    
    try {
        // Remove user permissions from channel
        await interaction.channel.permissionOverwrites.delete(targetUser.id);
        
        await interaction.reply({
            content: `✅ Removed <@${targetUser.id}> from the ticket.`,
            ephemeral: true
        });
        
        logger.info(`${targetUser.tag} removed from ticket ${ticket.ticket_id} by ${interaction.user.tag}`);
        
    } catch (error) {
        logger.error('Failed to remove user from ticket:', error);
        await interaction.reply({
            content: '❌ Failed to remove user from ticket.',
            ephemeral: true
        });
    }
}

function getCategoryDisplayName(category) {
    const categories = {
        'general': 'General Support',
        'bug': 'Bug Report',
        'feature': 'Feature Request',
        'appeal': 'Appeal',
        'other': 'Other'
    };
    return categories[category] || category;
}

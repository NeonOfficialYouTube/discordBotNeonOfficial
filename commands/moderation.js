const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('../utils/logger');
const { hasPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Moderation commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a member from the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for kick')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a member from the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for ban')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('delete_days')
                        .setDescription('Days of messages to delete (0-7)')
                        .setMinValue(0)
                        .setMaxValue(7)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Mute a member')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to mute')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Mute duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10080))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for mute')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unmute')
                .setDescription('Unmute a member')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to unmute')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear messages from channel')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of messages to delete (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Only delete messages from this user')
                        .setRequired(false))),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            // Check permissions
            if (!hasPermission(interaction.member, 'moderator')) {
                return interaction.reply({
                    content: '❌ You do not have permission to use moderation commands.',
                    ephemeral: true
                });
            }
            
            const db = getDatabase();
            
            switch (subcommand) {
                case 'kick':
                    await handleKick(interaction, db);
                    break;
                case 'ban':
                    await handleBan(interaction, db);
                    break;
                case 'mute':
                    await handleMute(interaction, db);
                    break;
                case 'unmute':
                    await handleUnmute(interaction, db);
                    break;
                case 'clear':
                    await handleClear(interaction, db);
                    break;
            }
            
        } catch (error) {
            logger.error('Error in moderation command:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the moderation command.',
                ephemeral: true
            });
        }
    }
};

async function handleKick(interaction, db) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const member = await interaction.guild.members.fetch(user.id);
    if (!member.kickable) {
        return interaction.reply({
            content: '❌ I cannot kick this user. They may have higher permissions.',
            ephemeral: true
        });
    }
    
    try {
        await member.kick(reason);
        
        // Log to database
        await db.run(
            'INSERT INTO moderation_logs (action, target_id, moderator_id, reason, guild_id) VALUES (?, ?, ?, ?, ?)',
            ['kick', user.id, interaction.user.id, reason, interaction.guild.id]
        );
        
        const embed = new EmbedBuilder()
            .setTitle('👢 Member Kicked')
            .setColor('#ff9500')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        logger.info(`${user.tag} was kicked by ${interaction.user.tag} for: ${reason}`);
        
    } catch (error) {
        logger.error('Failed to kick user:', error);
        await interaction.reply({
            content: '❌ Failed to kick the user.',
            ephemeral: true
        });
    }
}

async function handleBan(interaction, db) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;
    
    try {
        await interaction.guild.members.ban(user, {
            deleteMessageDays: deleteDays,
            reason: reason
        });
        
        // Log to database
        await db.run(
            'INSERT INTO moderation_logs (action, target_id, moderator_id, reason, guild_id) VALUES (?, ?, ?, ?, ?)',
            ['ban', user.id, interaction.user.id, reason, interaction.guild.id]
        );
        
        const embed = new EmbedBuilder()
            .setTitle('🔨 Member Banned')
            .setColor('#ff0000')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        logger.info(`${user.tag} was banned by ${interaction.user.tag} for: ${reason}`);
        
    } catch (error) {
        logger.error('Failed to ban user:', error);
        await interaction.reply({
            content: '❌ Failed to ban the user.',
            ephemeral: true
        });
    }
}

async function handleMute(interaction, db) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const member = await interaction.guild.members.fetch(user.id);
    const muteRole = interaction.guild.roles.cache.get(config.roles.muted);
    
    if (!muteRole) {
        return interaction.reply({
            content: '❌ Muted role not configured. Please set up a muted role.',
            ephemeral: true
        });
    }
    
    try {
        await member.roles.add(muteRole, reason);
        
        // Log to database
        await db.run(
            'INSERT INTO moderation_logs (action, target_id, moderator_id, reason, duration, guild_id) VALUES (?, ?, ?, ?, ?, ?)',
            ['mute', user.id, interaction.user.id, reason, duration, interaction.guild.id]
        );
        
        // Schedule unmute
        setTimeout(async () => {
            try {
                const currentMember = await interaction.guild.members.fetch(user.id);
                await currentMember.roles.remove(muteRole, 'Automatic unmute');
                logger.info(`${user.tag} was automatically unmuted`);
            } catch (error) {
                logger.error('Failed to automatically unmute user:', error);
            }
        }, duration * 60 * 1000);
        
        const embed = new EmbedBuilder()
            .setTitle('🔇 Member Muted')
            .setColor('#ffa500')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Duration', value: `${duration} minutes`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        logger.info(`${user.tag} was muted by ${interaction.user.tag} for ${duration} minutes: ${reason}`);
        
    } catch (error) {
        logger.error('Failed to mute user:', error);
        await interaction.reply({
            content: '❌ Failed to mute the user.',
            ephemeral: true
        });
    }
}

async function handleUnmute(interaction, db) {
    const user = interaction.options.getUser('user');
    
    const member = await interaction.guild.members.fetch(user.id);
    const muteRole = interaction.guild.roles.cache.get(config.roles.muted);
    
    if (!muteRole) {
        return interaction.reply({
            content: '❌ Muted role not configured.',
            ephemeral: true
        });
    }
    
    try {
        await member.roles.remove(muteRole, `Unmuted by ${interaction.user.tag}`);
        
        // Log to database
        await db.run(
            'INSERT INTO moderation_logs (action, target_id, moderator_id, reason, guild_id) VALUES (?, ?, ?, ?, ?)',
            ['unmute', user.id, interaction.user.id, 'Manual unmute', interaction.guild.id]
        );
        
        const embed = new EmbedBuilder()
            .setTitle('🔊 Member Unmuted')
            .setColor('#00ff00')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        logger.info(`${user.tag} was unmuted by ${interaction.user.tag}`);
        
    } catch (error) {
        logger.error('Failed to unmute user:', error);
        await interaction.reply({
            content: '❌ Failed to unmute the user.',
            ephemeral: true
        });
    }
}

async function handleClear(interaction, db) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');
    
    try {
        const messages = await interaction.channel.messages.fetch({ limit: amount });
        let toDelete = messages;
        
        if (targetUser) {
            toDelete = messages.filter(msg => msg.author.id === targetUser.id);
        }
        
        const deleted = await interaction.channel.bulkDelete(toDelete, true);
        
        // Log to database
        await db.run(
            'INSERT INTO moderation_logs (action, target_id, moderator_id, reason, guild_id) VALUES (?, ?, ?, ?, ?)',
            ['clear', targetUser?.id || 'all', interaction.user.id, `Cleared ${deleted.size} messages`, interaction.guild.id]
        );
        
        await interaction.reply({
            content: `✅ Deleted ${deleted.size} messages.`,
            ephemeral: true
        });
        
        logger.info(`${interaction.user.tag} cleared ${deleted.size} messages in ${interaction.channel.name}`);
        
    } catch (error) {
        logger.error('Failed to clear messages:', error);
        await interaction.reply({
            content: '❌ Failed to clear messages. Messages may be too old (over 14 days).',
            ephemeral: true
        });
    }
}

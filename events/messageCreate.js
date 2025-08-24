const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

// Simple anti-spam tracking
const userMessageCounts = new Map();
const SPAM_THRESHOLD = 5; // messages
const SPAM_WINDOW = 10000; // 10 seconds
const MUTE_DURATION = 300000; // 5 minutes

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Ignore DM messages
        if (!message.guild) return;
        
        // Anti-spam check
        await handleAntiSpam(message);
        
        // Log message if in configured log channel
        if (config.channels.logs && message.channel.id !== config.channels.logs) {
            await logMessage(message);
        }
    }
};

async function handleAntiSpam(message) {
    const userId = message.author.id;
    const now = Date.now();
    
    // Initialize user tracking if not exists
    if (!userMessageCounts.has(userId)) {
        userMessageCounts.set(userId, []);
    }
    
    const userMessages = userMessageCounts.get(userId);
    
    // Remove old messages outside the spam window
    const recentMessages = userMessages.filter(timestamp => now - timestamp < SPAM_WINDOW);
    
    // Add current message
    recentMessages.push(now);
    userMessageCounts.set(userId, recentMessages);
    
    // Check if user is spamming
    if (recentMessages.length >= SPAM_THRESHOLD) {
        try {
            // Check if user has admin/mod permissions
            const member = message.member;
            const hasAdminRole = config.roles.admin && member.roles.cache.has(config.roles.admin);
            const hasModerator = config.roles.moderator && member.roles.cache.has(config.roles.moderator);
            const hasManageMessages = member.permissions.has('MANAGE_MESSAGES');
            
            // Don't mute admins/mods
            if (hasAdminRole || hasModerator || hasManageMessages) {
                return;
            }
            
            // Delete recent messages
            const channel = message.channel;
            const messagesToDelete = await channel.messages.fetch({ limit: 50 });
            const userMessagesToDelete = messagesToDelete.filter(msg => 
                msg.author.id === userId && 
                now - msg.createdTimestamp < SPAM_WINDOW
            );
            
            if (userMessagesToDelete.size > 0) {
                await channel.bulkDelete(userMessagesToDelete);
            }
            
            // Apply mute role if configured
            if (config.roles.muted) {
                const muteRole = message.guild.roles.cache.get(config.roles.muted);
                if (muteRole) {
                    await member.roles.add(muteRole, 'Anti-spam automatic mute');
                    
                    // Remove mute after duration
                    setTimeout(async () => {
                        try {
                            await member.roles.remove(muteRole, 'Anti-spam automatic unmute');
                        } catch (error) {
                            logger.error('Failed to remove automatic mute:', error);
                        }
                    }, MUTE_DURATION);
                }
            }
            
            // Send warning message
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Anti-Spam Warning')
                .setDescription(`<@${userId}> has been temporarily muted for spamming.`)
                .setColor('#ffa500')
                .addFields(
                    { name: 'Duration', value: `${MUTE_DURATION / 1000 / 60} minutes`, inline: true },
                    { name: 'Reason', value: 'Automatic spam detection', inline: true }
                )
                .setTimestamp();
            
            await channel.send({ embeds: [warningEmbed] });
            
            // Clear user's message count
            userMessageCounts.delete(userId);
            
            logger.info(`Anti-spam: Muted ${message.author.tag} (${userId}) for spamming`);
            
        } catch (error) {
            logger.error('Anti-spam error:', error);
        }
    }
}

async function logMessage(message) {
    try {
        const logChannel = message.guild.channels.cache.get(config.channels.logs);
        if (!logChannel) return;
        
        // Only log certain events, not every message (to avoid spam)
        // This could be expanded to log message edits, deletes, etc.
        
    } catch (error) {
        logger.error('Message logging error:', error);
    }
}

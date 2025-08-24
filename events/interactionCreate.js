const { EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('../utils/logger');
const { verifyRobloxAccount } = require('../utils/roblox');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        }
    }
};

async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    
    try {
        await command.execute(interaction);
        logger.info(`${interaction.user.tag} executed /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
    } catch (error) {
        logger.error(`Error executing /${interaction.commandName}:`, error);
        
        const errorMessage = {
            content: '❌ There was an error while executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

async function handleButton(interaction) {
    const customId = interaction.customId;
    const db = getDatabase();
    
    try {
        if (customId.startsWith('suggestion_')) {
            await handleSuggestionVote(interaction, db, customId);
        } else if (customId.startsWith('verify_')) {
            await handleVerification(interaction, db, customId);
        } else if (customId.startsWith('ticket_close_')) {
            await handleTicketClose(interaction, db, customId);
        }
    } catch (error) {
        logger.error('Error handling button interaction:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your request.',
            ephemeral: true
        });
    }
}

async function handleSuggestionVote(interaction, db, customId) {
    const [, action, suggestionId] = customId.split('_');
    const userId = interaction.user.id;
    
    // Check if suggestion exists
    const suggestion = await db.get(
        'SELECT * FROM suggestions WHERE id = ?',
        [suggestionId]
    );
    
    if (!suggestion) {
        return interaction.reply({
            content: '❌ This suggestion no longer exists.',
            ephemeral: true
        });
    }
    
    // Prevent users from voting on their own suggestions
    if (suggestion.user_id === userId) {
        return interaction.reply({
            content: '❌ You cannot vote on your own suggestion.',
            ephemeral: true
        });
    }
    
    // Update vote count
    const column = action === 'upvote' ? 'upvotes' : 'downvotes';
    await db.run(
        `UPDATE suggestions SET ${column} = ${column} + 1 WHERE id = ?`,
        [suggestionId]
    );
    
    // Get updated suggestion
    const updatedSuggestion = await db.get(
        'SELECT * FROM suggestions WHERE id = ?',
        [suggestionId]
    );
    
    // Update embed with new vote counts
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields(
            { name: '👍 Upvotes', value: updatedSuggestion.upvotes.toString(), inline: true },
            { name: '👎 Downvotes', value: updatedSuggestion.downvotes.toString(), inline: true },
            { name: 'Suggestion ID', value: suggestionId, inline: true }
        );
    
    await interaction.update({
        embeds: [embed],
        components: interaction.message.components
    });
    
    logger.info(`${interaction.user.tag} ${action}d suggestion ${suggestionId}`);
}

async function handleVerification(interaction, db, customId) {
    const [, discordId, robloxId, verificationCode] = customId.split('_');
    
    // Check if this is the correct user
    if (interaction.user.id !== discordId) {
        return interaction.reply({
            content: '❌ This verification is not for you.',
            ephemeral: true
        });
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Verify the Roblox account
        const isVerified = await verifyRobloxAccount(robloxId, verificationCode);
        
        if (!isVerified.success) {
            return interaction.editReply({
                content: `❌ Verification failed: ${isVerified.error}`
            });
        }
        
        // Add verification to database
        await db.run(
            'INSERT INTO verification (discord_id, roblox_id, roblox_username, guild_id) VALUES (?, ?, ?, ?)',
            [discordId, robloxId, isVerified.username, interaction.guild.id]
        );
        
        // Add verified role if configured
        if (config.roles.verified) {
            const member = await interaction.guild.members.fetch(discordId);
            const verifiedRole = interaction.guild.roles.cache.get(config.roles.verified);
            
            if (verifiedRole) {
                await member.roles.add(verifiedRole);
            }
        }
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Verification Successful!')
            .setDescription(`Your Discord account has been successfully linked to **${isVerified.username}** on Roblox.`)
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.editReply({
            embeds: [successEmbed]
        });
        
        logger.info(`${interaction.user.tag} successfully verified as ${isVerified.username} (${robloxId})`);
        
    } catch (error) {
        logger.error('Verification error:', error);
        await interaction.editReply({
            content: '❌ An error occurred during verification. Please try again later.'
        });
    }
}

async function handleTicketClose(interaction, db, customId) {
    const ticketId = customId.replace('ticket_close_', '');
    const userId = interaction.user.id;
    
    // Get ticket info
    const ticket = await db.get(
        'SELECT * FROM tickets WHERE ticket_id = ? AND status = "open"',
        [ticketId]
    );
    
    if (!ticket) {
        return interaction.reply({
            content: '❌ This ticket is no longer available or already closed.',
            ephemeral: true
        });
    }
    
    // Check if user can close this ticket
    const canClose = ticket.user_id === userId || 
                    interaction.member.permissions.has('MANAGE_CHANNELS') ||
                    (config.roles.admin && interaction.member.roles.cache.has(config.roles.admin)) ||
                    (config.roles.moderator && interaction.member.roles.cache.has(config.roles.moderator));
    
    if (!canClose) {
        return interaction.reply({
            content: '❌ You do not have permission to close this ticket.',
            ephemeral: true
        });
    }
    
    // Update ticket status
    await db.run(
        'UPDATE tickets SET status = "closed", closed_at = CURRENT_TIMESTAMP, closed_by = ? WHERE ticket_id = ?',
        [userId, ticketId]
    );
    
    const closureEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`This ticket has been closed by <@${userId}>`)
        .setColor('#ff0000')
        .setTimestamp();
    
    await interaction.reply({ embeds: [closureEmbed] });
    
    // Delete channel after delay
    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (error) {
            logger.error('Failed to delete ticket channel:', error);
        }
    }, 10000);
    
    logger.info(`Ticket ${ticketId} closed by ${interaction.user.tag}`);
}

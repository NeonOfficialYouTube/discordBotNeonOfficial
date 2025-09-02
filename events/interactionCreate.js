const { EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('../utils/logger');

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
        } else if (customId === 'verify_button') { // Discord verification button
            const member = interaction.member;

            if (member.roles.cache.has(config.roles.verified)) {
                return interaction.reply({ content: 'You are already verified!', ephemeral: true });
            }

            await member.roles.add(config.roles.verified);
            return interaction.reply({ content: '✅ You have been verified!', ephemeral: true });
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
    
    if (suggestion.user_id === userId) {
        return interaction.reply({
            content: '❌ You cannot vote on your own suggestion.',
            ephemeral: true
        });
    }
    
    const column = action === 'upvote' ? 'upvotes' : 'downvotes';
    await db.run(
        `UPDATE suggestions SET ${column} = ${column} + 1 WHERE id = ?`,
        [suggestionId]
    );
    
    const updatedSuggestion = await db.get(
        'SELECT * FROM suggestions WHERE id = ?',
        [suggestionId]
    );
    
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

async function handleTicketClose(interaction, db, customId) {
    const ticketId = customId.replace('ticket_close_', '');
    const userId = interaction.user.id;
    
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
    
    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (error) {
            logger.error('Failed to delete ticket channel:', error);
        }
    }, 10000);
    
    logger.info(`Ticket ${ticketId} closed by ${interaction.user.tag}`);
}

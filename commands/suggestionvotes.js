const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestionvotes')
        .setDescription('Check votes for a suggestion')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID of the suggestion')
                .setRequired(true)
        ),
    async execute(interaction) {
        const db = getDatabase();
        const suggestionId = interaction.options.getInteger('id');

        try {
            const upvotes = await db.get(
                'SELECT COUNT(*) AS count FROM suggestionVotes WHERE suggestion_id = ? AND vote_type = ?',
                [suggestionId, 'upvote']
            );
            const downvotes = await db.get(
                'SELECT COUNT(*) AS count FROM suggestionVotes WHERE suggestion_id = ? AND vote_type = ?',
                [suggestionId, 'downvote']
            );

            await interaction.reply({
                content: `📊 Suggestion #${suggestionId} votes:\n👍 Upvotes: ${upvotes.count}\n👎 Downvotes: ${downvotes.count}`,
                ephemeral: true
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: '❌ An error occurred while fetching the votes.',
                ephemeral: true
            });
        }
    }
};

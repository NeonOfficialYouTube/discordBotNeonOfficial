const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestionvotes')
        .setDescription('Shows votes and voters for a suggestion')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID of the suggestion')
                .setRequired(true)
        ),

    async execute(interaction) {
        const db = getDatabase();
        const suggestionId = interaction.options.getInteger('id');

        try {
            // Get all votes for this suggestion
            const votes = await db.all(
                'SELECT user_id, vote_type FROM suggestionVotes WHERE suggestion_id = ?',
                [suggestionId]
            );

            if (votes.length === 0) {
                return interaction.reply({
                    content: `❌ No votes found for suggestion #${suggestionId}.`,
                    ephemeral: true
                });
            }

            // Separate upvotes and downvotes
            const upvotes = [];
            const downvotes = [];

            for (const vote of votes) {
                try {
                    const user = await interaction.client.users.fetch(vote.user_id);
                    if (vote.vote_type === 'upvote') {
                        upvotes.push(user.tag);
                    } else {
                        downvotes.push(user.tag);
                    }
                } catch {
                    // If user can't be fetched (left server or deleted), show ID
                    if (vote.vote_type === 'upvote') upvotes.push(vote.user_id);
                    else downvotes.push(vote.user_id);
                }
            }

            // Format message
            const reply = [
                `📊 Votes for suggestion #${suggestionId}:`,
                `✅ Upvotes (${upvotes.length}): ${upvotes.length ? upvotes.join(', ') : 'None'}`,
                `❌ Downvotes (${downvotes.length}): ${downvotes.length ? downvotes.join(', ') : 'None'}`
            ].join('\n');

            return interaction.reply({ content: reply, ephemeral: true });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: '❌ An error occurred while fetching votes.',
                ephemeral: true
            });
        }
    }
};

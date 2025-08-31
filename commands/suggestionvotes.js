const { getDatabase } = require('../database');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestionvotes')
        .setDescription('Shows the votes for a suggestion')
        .addIntegerOption(option =>
            option.setName('id')
                  .setDescription('Suggestion ID')
                  .setRequired(true)
        ),
    async execute(interaction) {
        const suggestionId = interaction.options.getInteger('id');
        const db = getDatabase();

        try {
            const votes = await db.all(
                'SELECT user_id, vote_type FROM suggestionVotes WHERE suggestion_id = ?',
                [suggestionId]
            );

            if (!votes.length) {
                return interaction.reply({
                    content: '❌ No one has voted on this suggestion yet.',
                    ephemeral: true
                });
            }

            const upvotes = votes.filter(v => v.vote_type === 'upvote').length;
            const downvotes = votes.filter(v => v.vote_type === 'downvote').length;

            return interaction.reply({
                content: `Suggestion #${suggestionId} has:\n👍 ${upvotes} upvotes\n👎 ${downvotes} downvotes`,
                ephemeral: true
            });
        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: '❌ An error occurred while fetching votes.',
                ephemeral: true
            });
        }
    }
};


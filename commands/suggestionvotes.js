const { getDatabase } = require('../database');

module.exports = {
    name: 'suggestionvotes', // slash command name
    description: 'Check votes for a suggestion by ID',
    options: [
        {
            name: 'id',
            type: 4, // INTEGER type
            description: 'The suggestion ID to check',
            required: true
        }
    ],
    async execute(interaction) {
        const suggestionId = interaction.options.getInteger('id');
        const db = getDatabase();

        try {
            const upvotes = await db.get(
                'SELECT COUNT(*) AS count FROM suggestionVotes WHERE suggestion_id = ? AND vote_type = ?',
                [suggestionId, 'upvote']
            );

            const downvotes = await db.get(
                'SELECT COUNT(*) AS count FROM suggestionVotes WHERE suggestion_id = ? AND vote_type = ?',
                [suggestionId, 'downvote']
            );

            return interaction.reply({
                content: `📊 Votes for suggestion ID ${suggestionId}:\n👍 Upvotes: ${upvotes.count}\n👎 Downvotes: ${downvotes.count}`,
                ephemeral: false
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

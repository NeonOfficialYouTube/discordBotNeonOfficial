const { getDatabase } = require('../database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return; // only handle buttons

        const db = getDatabase();
        const userId = interaction.user.id;
        const customId = interaction.customId;

        // Check if button is a suggestion vote button
        const match = customId.match(/^suggestion_(upvote|downvote)_(\d+)$/);
        if (!match) return;

        const voteType = match[1]; // 'upvote' or 'downvote'
        const suggestionId = parseInt(match[2]);

        try {
            // Check if user already voted
            const existingVote = await db.get(
                'SELECT vote_type FROM suggestionVotes WHERE suggestion_id = ? AND user_id = ?',
                [suggestionId, userId]
            );

            if (existingVote) {
                if (existingVote.vote_type === voteType) {
                    return interaction.reply({
                        content: `❌ You already ${voteType}d this suggestion.`,
                        ephemeral: true
                    });
                } else {
                    // User is changing vote
                    await db.run(
                        'UPDATE suggestionVotes SET vote_type = ? WHERE suggestion_id = ? AND user_id = ?',
                        [voteType, suggestionId, userId]
                    );
                    return interaction.reply({
                        content: `✅ You changed your vote to a ${voteType}.`,
                        ephemeral: true
                    });
                }
            }

            // Insert new vote
            await db.run(
                'INSERT INTO suggestionVotes (suggestion_id, user_id, vote_type) VALUES (?, ?, ?)',
                [suggestionId, userId, voteType]
            );

            return interaction.reply({
                content: `✅ Your ${voteType} has been counted!`,
                ephemeral: true
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                content: '❌ An error occurred while recording your vote.',
                ephemeral: true
            });
        }
    }
};

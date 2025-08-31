const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestionvotes')
        .setDescription('See who voted on a suggestion')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('The suggestion ID')
                .setRequired(true)
        ),

    async execute(interaction) {
        const suggestionId = interaction.options.getInteger('id');
        const db = getDatabase();

        // Get all votes for this suggestion
        const votes = await db.all(
            'SELECT user_id, vote_type FROM suggestionVotes WHERE suggestion_id = ?',
            [suggestionId]
        );

        if (!votes.length) return interaction.reply('No votes yet for this suggestion.');

        const embed = new EmbedBuilder()
            .setTitle(`Votes for Suggestion ID ${suggestionId}`)
            .setDescription(votes.map(v => `<@${v.user_id}>: ${v.vote_type}`).join('\n'))
            .setColor(0x00FFFF)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

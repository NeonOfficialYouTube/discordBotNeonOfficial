const { SlashCommandBuilder } = require('discord.js');

// List of allowed user IDs
const allowedUsers = ['1345050725637685288', '1320938370586902609'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a number of messages from this channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Restrict to allowed users
        if (!allowedUsers.includes(interaction.user.id)) {
            return interaction.reply({ content: "You can't use this command!", ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount');

        // Validate amount
        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: 'You can only delete between 1 and 100 messages at a time.', ephemeral: true });
        }

        try {
            const deletedMessages = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `Successfully deleted ${deletedMessages.size} messages.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to delete messages. Make sure they are not older than 14 days.', ephemeral: true });
        }
    },
};

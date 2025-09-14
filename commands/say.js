const { SlashCommandBuilder } = require('discord.js');

// List of allowed user IDs
const allowedUsers = ['1345050725637685288', '1320938370586902609'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Bot sends a message in the channel')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Check if user is allowed
        if (!allowedUsers.includes(interaction.user.id)) {
            return interaction.reply({ content: "You can't use this command!", ephemeral: true });
        }

        const text = interaction.options.getString('message');
        await interaction.channel.send(text); // sends normal message
        await interaction.reply({ content: 'Message sent!', ephemeral: true }); // private confirmation
    },
};

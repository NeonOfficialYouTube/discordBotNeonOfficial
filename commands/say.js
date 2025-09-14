const { SlashCommandBuilder } = require('discord.js');

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
        const text = interaction.options.getString('message');

        // Send the message in the same channel
        await interaction.channel.send(text);

        // Optional: reply to the user that it worked (ephemeral = only they see it)
        await interaction.reply({ content: 'Message sent!', ephemeral: true });
    },
};

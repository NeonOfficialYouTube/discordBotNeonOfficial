const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverwarning')
        .setDescription('Send a serious server-wide warning')
        .addStringOption(option =>
            option.setName('message')
                  .setDescription('The warning message')
                  .setRequired(true)
        ),
    async execute(interaction) {
        const warningMessage = interaction.options.getString('message');
        const warningChannel = interaction.guild.channels.cache.get('1375566168357867590');

        if (!warningChannel) {
            return interaction.reply({ content: '❌ Warning channel not found!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('⚠️ SERVER WARNING ⚠️')
            .setDescription(warningMessage)
            .setColor('#FF0000')
            .setTimestamp();

        // Send with a role mention, e.g., @Staff
        await warningChannel.send({ content: '@Staff', embeds: [embed] }); 

        await interaction.reply({ content: '✅ Server warning sent!', ephemeral: true });
    }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Lock or unlock the entire server')
        .addBooleanOption(option =>
            option.setName('lock')
                  .setDescription('true to lockdown, false to unlock')
                  .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ You need to be an admin to use this.', ephemeral: true });
        }

        const lock = interaction.options.getBoolean('lock');
        const everyoneRole = interaction.guild.roles.everyone;

        try {
            // Loop through all channels
            for (const [, channel] of interaction.guild.channels.cache) {
                // Only lock text & threads
                if (channel.isTextBased()) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: !lock,
                        AddReactions: !lock,
                    });
                }
            }

            await interaction.reply({
                content: lock ? '🔒 Server is now in full lockdown!' : '🔓 Server has been unlocked!',
            });
        } catch (err) {
            console.error(err);
            interaction.reply({ content: '❌ An error occurred while changing permissions.', ephemeral: true });
        }
    }
};

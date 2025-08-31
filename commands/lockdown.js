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

        // Reply immediately to avoid timeout
        await interaction.reply({
            content: lock ? '🔒 Locking server...' : '🔓 Unlocking server...',
            ephemeral: true
        });

        try {
            const promises = [];
            for (const [, channel] of interaction.guild.channels.cache) {
                if (channel.isTextBased()) {
                    promises.push(
                        channel.permissionOverwrites.edit(everyoneRole, {
                            SendMessages: !lock,
                            AddReactions: !lock,
                        })
                    );
                }
            }
            await Promise.all(promises);

            await interaction.editReply({
                content: lock ? '🔒 Server is now in full lockdown!' : '🔓 Server has been unlocked!'
            });
        } catch (err) {
            console.error(err);
            interaction.editReply({ content: '❌ An error occurred while changing permissions.' });
        }
    }
};

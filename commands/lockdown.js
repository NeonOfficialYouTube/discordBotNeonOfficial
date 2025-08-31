const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Lock or unlock all channels for @everyone')
        .addBooleanOption(option =>
            option.setName('lock')
                  .setDescription('True to lock, false to unlock')
                  .setRequired(true)
        ),
    async execute(interaction) {
        // Make sure the user has admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ You need Administrator to use this command.', ephemeral: true });
        }

        const lock = interaction.options.getBoolean('lock');
        const everyoneRole = interaction.guild.roles.everyone;

        let failedChannels = [];

        await interaction.reply({ content: `${lock ? 'Locking' : 'Unlocking'} channels...`, ephemeral: true });

        for (const channel of interaction.guild.channels.cache.values()) {
            try {
                // Skip if bot can't manage the channel
                if (!channel.permissionsFor(interaction.guild.members.me).has('ManageChannels')) continue;

                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: !lock,
                    AddReactions: !lock,
                });
            } catch (err) {
                failedChannels.push(channel.name);
            }
        }

        if (failedChannels.length) {
            interaction.editReply(`✅ Done, but failed to change permissions for: ${failedChannels.join(', ')}`);
        } else {
            interaction.editReply(`✅ All channels have been ${lock ? 'locked' : 'unlocked'}.`);
        }
    }
};

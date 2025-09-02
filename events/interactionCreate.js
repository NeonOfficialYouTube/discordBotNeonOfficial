module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
            }
        }

        // Handle buttons
        if (!interaction.isButton()) return;

        // Verification button
        if (interaction.customId.startsWith('verify_')) {
            const userId = interaction.customId.split('_')[1];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ You cannot press this button.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });

            // Add the verified role
            const role = interaction.guild.roles.cache.get(client.config.roles.verified);
            if (!role) return interaction.reply({ content: '❌ Verified role not found. Check your config.', ephemeral: true });

            await member.roles.add(role).catch(() => null);

            await interaction.update({
                content: `✅ You have been verified!`,
                embeds: [],
                components: []
            });
        }
    }
};

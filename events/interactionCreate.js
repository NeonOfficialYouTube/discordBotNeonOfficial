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

        const customId = interaction.customId;

        // ===== Verification button =====
        if (customId.startsWith('verify_')) {
            const userId = customId.split('_')[1];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ You cannot press this button.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });

            const role = interaction.guild.roles.cache.get(client.config.roles.verified);
            if (!role) return interaction.reply({ content: '❌ Verified role not found. Check your config.', ephemeral: true });

            await member.roles.add(role).catch(() => null);

            await interaction.update({
                content: `✅ You have been verified!`,
                embeds: [],
                components: []
            });
        }

        // ===== LOA buttons =====
        else if (customId.startsWith('loa-')) {
            // Only allow specific staff to approve/deny
            const allowedUsers = ['1345050725637685288', '1320938370586902609']; // Replace with your staff IDs
            if (!allowedUsers.includes(interaction.user.id)) {
                return interaction.reply({ content: '❌ You are not allowed to approve/deny LOA requests.', ephemeral: true });
            }

            // Expected format: loa-yes-requesterId or loa-no-requesterId
            const parts = customId.split('-');
            const action = parts[1]; // 'yes' or 'no'
            const requesterId = parts[2];

            const requester = await interaction.guild.members.fetch(requesterId).catch(() => null);
            if (!requester) return interaction.reply({ content: '❌ User not found in server.', ephemeral: true });

            if (action === 'yes') {
                const loaRole = interaction.guild.roles.cache.find(r => r.name === 'Leave Of Absence');
                if (loaRole) await requester.roles.add(loaRole);

                await requester.send('✅ Your Leave Of Absence has been approved!');
                await interaction.reply({ content: `✅ LOA approved for ${requester.user.tag}`, ephemeral: false });
            } else if (action === 'no') {
                await requester.send('❌ Your Leave Of Absence request was denied.');
                await interaction.reply({ content: `❌ LOA denied for ${requester.user.tag}`, ephemeral: false });
            }

            // Disable buttons after decision
            const message = interaction.message;
            message.components.forEach(row => row.components.forEach(btn => btn.setDisabled(true)));
            await message.edit({ components: message.components });
        }
    }
};

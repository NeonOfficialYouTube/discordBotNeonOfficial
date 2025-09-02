const config = require('../config');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error('Command error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
                }
            }
            return;
        }

        // Handle buttons
        if (!interaction.isButton()) return;

        // Verification button
        if (interaction.customId.startsWith('verify_')) {
            try {
                const userId = interaction.customId.split('_')[1];
                if (interaction.user.id !== userId) {
                    return interaction.reply({ content: '❌ You cannot press this button.', ephemeral: true });
                }

                const member = await interaction.guild.members.fetch(userId).catch(() => null);
                if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });

                const role = interaction.guild.roles.cache.get(config.roles.verified);
                if (!role) return interaction.reply({ content: '❌ Verified role not found. Check your config.', ephemeral: true });

                await member.roles.add(role).catch(() => null);

                await interaction.update({
                    content: '✅ You have been verified!',
                    embeds: [],
                    components: []
                });
            } catch (err) {
                console.error('Verification button error:', err);
                if (!interaction.replied) {
                    await interaction.reply({ content: 'There was an error verifying you.', ephemeral: true });
                }
            }
            return;
        }

        // LOA buttons
        if (interaction.customId.startsWith('loa-')) {
            try {
                const [action, requesterId] = interaction.customId.split('-'); // "loa-yes-USERID"
                const allowedUsers = ['1345050725637685288', '1320938370586902609']; // Only these can approve/deny

                if (!allowedUsers.includes(interaction.user.id)) {
                    return interaction.reply({ content: '❌ You are not allowed to approve/deny LOA requests.', ephemeral: true });
                }

                const member = await interaction.guild.members.fetch(requesterId).catch(() => null);
                if (!member) return interaction.reply({ content: '❌ User not found in the server.', ephemeral: true });

                const loaRole = interaction.guild.roles.cache.find(r => r.name === 'Leave Of Absence');

                if (action === 'loa-yes') {
                    if (loaRole) await member.roles.add(loaRole).catch(() => null);
                    await member.send('Your Leave Of Absence has been approved!').catch(() => null);
                    await interaction.user.send(`✅ You approved ${member.user.tag}'s LOA.`).catch(() => null);

                    await interaction.update({ content: 'LOA approved ✅', components: [] });
                } else if (action === 'loa-no') {
                    await member.send('Your Leave Of Absence request was not approved.').catch(() => null);
                    await interaction.user.send(`❌ You denied ${member.user.tag}'s LOA.`).catch(() => null);

                    await interaction.update({ content: 'LOA denied ❌', components: [] });
                }
            } catch (err) {
                console.error('LOA button error:', err);
                if (!interaction.replied) {
                    await interaction.reply({ content: 'There was an error processing this LOA request.', ephemeral: true });
                }
            }
            return;
        }
    }
};

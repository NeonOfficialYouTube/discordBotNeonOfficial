const config = require('../config');
const { getDatabase } = require('../database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // 🔹 Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Command error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ There was an error executing this command.',
                        ephemeral: true,
                    });
                }
            }
            return;
        }

        // 🔹 Buttons
        if (interaction.isButton()) {

            // ✅ Verification Button
            if (interaction.customId.startsWith('verify_')) {
                try {
                    const userId = interaction.customId.split('_')[1];
                    if (interaction.user.id !== userId) {
                        return interaction.reply({ content: '❌ You cannot press this button.', ephemeral: true });
                    }

                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });

                    const verifiedRole = interaction.guild.roles.cache.get('1412863370108993598'); // ← your verified role ID
                    if (!verifiedRole) return interaction.reply({ content: '❌ Verified role not found. Check your config.', ephemeral: true });

                    await member.roles.add(verifiedRole).catch(err => console.error('Error adding verified role:', err));

                    await interaction.update({
                        content: '✅ You have been verified!',
                        embeds: [],
                        components: []
                    });

                } catch (err) {
                    console.error('Verification button error:', err);
                    if (!interaction.replied) {
                        await interaction.reply({ content: '❌ There was an error verifying you.', ephemeral: true });
                    }
                }
                return;
            }

            // ✅ LOA Buttons
            if (interaction.customId.startsWith('loa-')) {
                try {
                    const [_, action, requesterId] = interaction.customId.split('-'); // e.g. "loa-yes-USERID"
                    const allowedUsers = ['1345050725637685288', '1320938370586902609']; // approvers

                    if (!allowedUsers.includes(interaction.user.id)) {
                        return interaction.reply({ content: '❌ You are not allowed to approve/deny LOA requests.', ephemeral: true });
                    }

                    const member = await interaction.guild.members.fetch(requesterId).catch(() => null);
                    if (!member) return interaction.reply({ content: '❌ User not found in the server.', ephemeral: true });

                    const loaRole = interaction.guild.roles.cache.get('YOUR_LOA_ROLE_ID_HERE'); // ← use the actual role ID
                    if (!loaRole) return interaction.reply({ content: '❌ LOA role not found!', ephemeral: true });

                    const db = getDatabase();

                    if (action === 'yes') {
                        await member.roles.add(loaRole).catch(err => console.error('Error adding LOA role:', err));

                        // ⏳ Auto-remove after stored duration
                        const row = await db.get(`SELECT days FROM loaRequests WHERE user_id = ?`, [requesterId]);
                        if (row && row.days) {
                            const durationMs = row.days * 24 * 60 * 60 * 1000;
                            setTimeout(async () => {
                                if (member.roles.cache.has(loaRole.id)) {
                                    await member.roles.remove(loaRole).catch(() => null);
                                    await member.send('⏳ Your **Leave Of Absence** has ended. The role has been removed.').catch(() => null);
                                }
                            }, durationMs);
                        }

                        await member.send('✅ Your LOA request has been approved.').catch(() => null);
                        await interaction.update({ content: `LOA approved ✅ by ${interaction.user.tag}`, components: [] });
                    }

                    if (action === 'no') {
                        await member.send('❌ Your LOA request was denied.').catch(() => null);
                        await interaction.update({ content: `LOA denied ❌ by ${interaction.user.tag}`, components: [] });
                    }

                } catch (err) {
                    console.error('LOA button error:', err);
                    if (!interaction.replied) {
                        await interaction.reply({ content: '❌ There was an error processing this LOA request.', ephemeral: true });
                    }
                }
                return;
            }
        }
    }
};

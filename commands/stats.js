const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get Roblox player info')
        .addStringOption(option =>
            option.setName('username')
                  .setDescription('Roblox username')
                  .setRequired(true)
        ),
    async execute(interaction) {
        const username = interaction.options.getString('username');

        try {
            // Get basic user info
            const userRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
            const userData = await userRes.json();

            if (userData.errorMessage) {
                return interaction.reply({ content: `❌ User "${username}" not found.`, ephemeral: true });
            }

            const userId = userData.Id;

            // Get avatar thumbnail
            const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;

            // Optional: Get groups
            const groupsRes = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
            const groupsData = await groupsRes.json();

            const groupNames = groupsData.map(g => `${g.role.name} at ${g.group.name}`).join('\n') || 'No groups';

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`${userData.Username}'s Roblox Stats`)
                .setThumbnail(avatarUrl)
                .addFields(
                    { name: 'UserID', value: `${userId}`, inline: true },
                    { name: 'Join Date', value: new Date(userData.Created).toDateString(), inline: true },
                    { name: 'Groups', value: groupNames }
                )
                .setColor('#FF0000')
                .setFooter({ text: 'Roblox Stats' });

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            interaction.reply({ content: '❌ An error occurred while fetching Roblox data.', ephemeral: true });
        }
    }
};

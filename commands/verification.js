const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('../utils/logger');
const { checkCooldown, setCooldown } = require('../utils/permissions');
const { getRobloxUserInfo, verifyRobloxAccount } = require('../utils/roblox');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Roblox account')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            const robloxUsername = interaction.options.getString('username');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            
            // Check cooldown
            const cooldownCheck = await checkCooldown(userId, 'verification', config.cooldowns.verification);
            if (!cooldownCheck.canExecute) {
                const timeLeft = Math.ceil(cooldownCheck.timeLeft / 1000 / 60);
                return interaction.reply({
                    content: `⏰ You can attempt verification again in ${timeLeft} minutes.`,
                    ephemeral: true
                });
            }
            
            const db = getDatabase();
            
            // Check if user is already verified
            const existingVerification = await db.get(
                'SELECT * FROM verification WHERE discord_id = ? AND guild_id = ?',
                [userId, guildId]
            );
            
            if (existingVerification) {
                return interaction.reply({
                    content: `✅ You are already verified as **${existingVerification.roblox_username}**.`,
                    ephemeral: true
                });
            }
            
            // Get Roblox user info
            const robloxInfo = await getRobloxUserInfo(robloxUsername);
            if (!robloxInfo) {
                return interaction.reply({
                    content: '❌ Could not find a Roblox user with that username. Please check the spelling and try again.',
                    ephemeral: true
                });
            }
            
            // Check if Roblox account is already verified by someone else
            const existingRobloxVerification = await db.get(
                'SELECT * FROM verification WHERE roblox_id = ? AND guild_id = ?',
                [robloxInfo.id, guildId]
            );
            
            if (existingRobloxVerification) {
                return interaction.reply({
                    content: '❌ This Roblox account is already verified by another Discord user.',
                    ephemeral: true
                });
            }
            
            // Generate verification code
            const verificationCode = Math.random().toString(36).substring(2, 15);
            
            // Set cooldown
            await setCooldown(userId, 'verification', config.cooldowns.verification, guildId);
            
            const verificationEmbed = new EmbedBuilder()
                .setTitle('🔗 Roblox Account Verification')
                .setDescription(`To verify your Roblox account **${robloxInfo.displayName}** (@${robloxInfo.name}), please follow these steps:`)
                .addFields(
                    {
                        name: '📝 Step 1',
                        value: 'Copy the verification code below',
                        inline: false
                    },
                    {
                        name: '🔢 Verification Code',
                        value: `\`${verificationCode}\``,
                        inline: false
                    },
                    {
                        name: '🌐 Step 2',
                        value: `Go to your [Roblox profile](https://www.roblox.com/users/${robloxInfo.id}/profile) and add the verification code to your "About" section`,
                        inline: false
                    },
                    {
                        name: '✅ Step 3',
                        value: 'Click the "Verify Account" button below once you\'ve updated your profile',
                        inline: false
                    }
                )
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxInfo.id}&width=420&height=420&format=png`)
                .setColor(config.embedColor)
                .setFooter({ text: 'This verification will expire in 10 minutes' })
                .setTimestamp();
            
            const verifyButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_${userId}_${robloxInfo.id}_${verificationCode}`)
                        .setLabel('Verify Account')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✅')
                );
            
            await interaction.reply({
                embeds: [verificationEmbed],
                components: [verifyButton],
                ephemeral: true
            });
            
            logger.info(`Verification initiated for ${interaction.user.tag} with Roblox account ${robloxUsername} (${robloxInfo.id})`);
            
        } catch (error) {
            logger.error('Error in verification command:', error);
            await interaction.reply({
                content: '❌ An error occurred during verification. Please try again later.',
                ephemeral: true
            });
        }
    }
};

const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { initializeDatabase } = require('./database');
const logger = require('./utils/logger');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands (flat folder)
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
    }
}

// Load events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(`Loaded event: ${event.name}`);
}

// 🔹 LOA Button Handling
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    const [action, userId] = interaction.customId.split('_');
    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!member) {
        return interaction.reply({ content: '⚠️ User not found in this server.', ephemeral: true });
    }

    // Only allow YOU and JOHNNY to approve/deny
    const allowedUsers = ['1345050725637685288', '1320938370586902609']; // replace with your IDs
    if (!allowedUsers.includes(interaction.user.id)) {
        return interaction.reply({ content: '🚫 You cannot approve or deny LOAs.', ephemeral: true });
    }

    const db = require('./database').getDatabase();

    if (action === 'approve') {
        const loaRole = interaction.guild.roles.cache.find(r => r.name === 'Leave Of Absence');
        if (!loaRole) {
            return interaction.reply({ content: '⚠️ The **Leave Of Absence** role was not found.', ephemeral: true });
        }

        await member.roles.add(loaRole).catch(() => null);

        // 🔹 Get duration from database (assumes /requestLOA stored it in "days" column)
        const row = await db.get(`SELECT days FROM loaRequests WHERE user_id = ?`, [userId]);
        if (row && row.days) {
            const durationMs = row.days * 24 * 60 * 60 * 1000;

            setTimeout(async () => {
                if (member.roles.cache.has(loaRole.id)) {
                    await member.roles.remove(loaRole).catch(() => null);
                    try {
                        await member.send(`⏳ Your **Leave Of Absence** has ended. The role has been removed.`);
                    } catch {
                        console.log(`Could not DM ${member.user.tag}`);
                    }
                }
            }, durationMs);
        }

        try {
            await member.send(`✅ Your LOA request has been **approved**. You now have the Leave Of Absence role.`);
        } catch {
            console.log(`Could not DM ${member.user.tag}`);
        }

        await interaction.update({ content: `✅ Approved by ${interaction.user.tag}`, components: [], embeds: interaction.message.embeds });
    }

    if (action === 'deny') {
        try {
            await member.send(`❌ Your LOA request has been **denied**.`);
        } catch {
            console.log(`Could not DM ${member.user.tag}`);
        }

        await interaction.update({ content: `❌ Denied by ${interaction.user.tag}`, components: [], embeds: interaction.message.embeds });
    }
});

// Initialize database and start bot
async function startBot() {
    try {
        await initializeDatabase();
        logger.info('Database initialized successfully');

        const db = require('./database').getDatabase(); // make sure getDatabase exists in your database.js

        await db.run(`
            CREATE TABLE IF NOT EXISTS suggestionVotes (
                suggestion_id INTEGER,
                user_id TEXT,
                vote_type TEXT,
                PRIMARY KEY (suggestion_id, user_id)
            )
        `);

        // 🔹 Table for LOA requests (if not already created)
        await db.run(`
            CREATE TABLE IF NOT EXISTS loaRequests (
                user_id TEXT PRIMARY KEY,
                days INTEGER
            )
        `);

        logger.info('Suggestion votes + LOA tables ensured');
        
        await client.login(config.token);
        logger.info('Bot started successfully');
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

startBot();

module.exports = client;

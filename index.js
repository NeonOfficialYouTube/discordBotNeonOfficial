const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
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
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`Loaded event: ${event.name}`);
}

// Initialize database and start bot
async function startBot() {
    try {
        await initializeDatabase();
        logger.info('Database initialized successfully');

        const db = require('./database').getDatabase();

        // Suggestion votes table
        await db.run(`
            CREATE TABLE IF NOT EXISTS suggestionVotes (
                suggestion_id INTEGER,
                user_id TEXT,
                vote_type TEXT,
                PRIMARY KEY (suggestion_id, user_id)
            )
        `);

        // LOA requests table
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

const { REST, Routes } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.info(`Bot logged in as ${client.user.tag}!`);
        logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
        
        // Set bot activity
        client.user.setActivity('Roblox Community Management', { type: 'WATCHING' });
        
        // Register slash commands
        await registerSlashCommands(client);
        
        logger.info('Bot is ready and online!');
    }
};

async function registerSlashCommands(client) {
    try {
        const commands = [];
        
        // Collect all command data
        client.commands.forEach(command => {
            if (command.data) {
                commands.push(command.data.toJSON());
            }
        });
        
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);
        
        // Register commands globally or per guild
        if (config.guildId) {
            // Register for specific guild (faster for development)
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands }
            );
            logger.info(`Successfully reloaded ${commands.length} guild application (/) commands.`);
        } else {
            // Register globally (takes up to 1 hour to propagate)
            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );
            logger.info(`Successfully reloaded ${commands.length} global application (/) commands.`);
        }
        
    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

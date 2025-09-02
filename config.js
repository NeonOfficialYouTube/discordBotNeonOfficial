const config = {
    // Bot configuration
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || 'your_client_id_here',
    guildId: process.env.GUILD_ID || null,
    
    // Roblox API configuration
    robloxApiKey: process.env.ROBLOX_API_KEY || '',
    
    // Channel IDs
    channels: {
        suggestions: process.env.SUGGESTIONS_CHANNEL || null,
        tickets: process.env.TICKETS_CHANNEL || null,
        logs: process.env.LOGS_CHANNEL || null,
        verification: process.env.VERIFICATION_CHANNEL || null,
        loaRequests: process.env.LOA_CHANNEL || null // <-- new LOA channel
    },
    
    // Role IDs
    roles: {
        admin: process.env.ADMIN_ROLE || null,
        moderator: process.env.MODERATOR_ROLE || null,
        verified: process.env.VERIFIED_ROLE || null,
        muted: process.env.MUTED_ROLE || null
    },
    
    // Bot settings
    prefix: process.env.PREFIX || '!',
    embedColor: '#5865F2',
    
    // Rate limiting
    cooldowns: {
        suggestion: 300000, // 5 minutes
        ticket: 600000, // 10 minutes
        verification: 3600000 // 1 hour
    },
    
    // Database
    database: {
        path: './bot_database.sqlite'
    }
};

module.exports = config;

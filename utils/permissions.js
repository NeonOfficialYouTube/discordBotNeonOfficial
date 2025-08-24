const { getDatabase } = require('../database');
const config = require('../config');
const logger = require('./logger');

/**
 * Check if a member has the required permission level
 * @param {GuildMember} member - Discord guild member
 * @param {string} level - Permission level ('admin', 'moderator')
 * @returns {boolean} Whether the member has the required permission
 */
function hasPermission(member, level) {
    if (!member) return false;
    
    // Check Discord permissions first
    if (member.permissions.has('ADMINISTRATOR')) {
        return true;
    }
    
    switch (level) {
        case 'admin':
            return config.roles.admin ? member.roles.cache.has(config.roles.admin) : 
                   member.permissions.has('MANAGE_GUILD');
        
        case 'moderator':
            const hasModRole = config.roles.moderator ? member.roles.cache.has(config.roles.moderator) : false;
            const hasAdminRole = config.roles.admin ? member.roles.cache.has(config.roles.admin) : false;
            const hasManageMessages = member.permissions.has('MANAGE_MESSAGES');
            
            return hasModRole || hasAdminRole || hasManageMessages;
        
        default:
            return false;
    }
}

/**
 * Check if a user is on cooldown for a specific command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 * @param {number} cooldownMs - Cooldown duration in milliseconds
 * @returns {Object} Cooldown status
 */
async function checkCooldown(userId, command, cooldownMs) {
    try {
        const db = getDatabase();
        const now = new Date();
        
        // Clean up expired cooldowns
        await db.run(
            'DELETE FROM cooldowns WHERE expires_at <= ?',
            [now.toISOString()]
        );
        
        // Check if user has active cooldown
        const cooldown = await db.get(
            'SELECT * FROM cooldowns WHERE user_id = ? AND command = ? AND expires_at > ?',
            [userId, command, now.toISOString()]
        );
        
        if (cooldown) {
            const expiresAt = new Date(cooldown.expires_at);
            const timeLeft = expiresAt.getTime() - now.getTime();
            
            return {
                canExecute: false,
                timeLeft: timeLeft
            };
        }
        
        return {
            canExecute: true,
            timeLeft: 0
        };
        
    } catch (error) {
        logger.error('Error checking cooldown:', error);
        return {
            canExecute: true,
            timeLeft: 0
        };
    }
}

/**
 * Set a cooldown for a user and command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 * @param {number} cooldownMs - Cooldown duration in milliseconds
 * @param {string} guildId - Guild ID
 */
async function setCooldown(userId, command, cooldownMs, guildId = null) {
    try {
        const db = getDatabase();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + cooldownMs);
        
        await db.run(
            'INSERT OR REPLACE INTO cooldowns (user_id, command, expires_at, guild_id) VALUES (?, ?, ?, ?)',
            [userId, command, expiresAt.toISOString(), guildId]
        );
        
    } catch (error) {
        logger.error('Error setting cooldown:', error);
    }
}

/**
 * Remove cooldown for a user and command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 */
async function removeCooldown(userId, command) {
    try {
        const db = getDatabase();
        
        await db.run(
            'DELETE FROM cooldowns WHERE user_id = ? AND command = ?',
            [userId, command]
        );
        
    } catch (error) {
        logger.error('Error removing cooldown:', error);
    }
}

/**
 * Clean up all expired cooldowns
 */
async function cleanupCooldowns() {
    try {
        const db = getDatabase();
        const now = new Date();
        
        const result = await db.run(
            'DELETE FROM cooldowns WHERE expires_at <= ?',
            [now.toISOString()]
        );
        
        if (result.changes > 0) {
            logger.info(`Cleaned up ${result.changes} expired cooldowns`);
        }
        
    } catch (error) {
        logger.error('Error cleaning up cooldowns:', error);
    }
}

/**
 * Get all active cooldowns for a user
 * @param {string} userId - Discord user ID
 * @returns {Array} Array of active cooldowns
 */
async function getUserCooldowns(userId) {
    try {
        const db = getDatabase();
        const now = new Date();
        
        const cooldowns = await db.all(
            'SELECT * FROM cooldowns WHERE user_id = ? AND expires_at > ?',
            [userId, now.toISOString()]
        );
        
        return cooldowns.map(cooldown => ({
            command: cooldown.command,
            expiresAt: new Date(cooldown.expires_at),
            timeLeft: new Date(cooldown.expires_at).getTime() - now.getTime()
        }));
        
    } catch (error) {
        logger.error('Error getting user cooldowns:', error);
        return [];
    }
}

/**
 * Check if a user is rate limited (generic rate limiting)
 * @param {string} userId - Discord user ID
 * @param {string} action - Action being performed
 * @param {number} maxActions - Maximum actions allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Rate limit status
 */
async function checkRateLimit(userId, action, maxActions = 5, windowMs = 60000) {
    try {
        const db = getDatabase();
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);
        
        // Count actions in the current window
        const actionCount = await db.get(
            'SELECT COUNT(*) as count FROM cooldowns WHERE user_id = ? AND command = ? AND expires_at > ?',
            [userId, `ratelimit_${action}`, windowStart.toISOString()]
        );
        
        const currentCount = actionCount.count || 0;
        
        if (currentCount >= maxActions) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: windowStart.getTime() + windowMs
            };
        }
        
        // Record this action
        const expiresAt = new Date(now.getTime() + windowMs);
        await db.run(
            'INSERT INTO cooldowns (user_id, command, expires_at, guild_id) VALUES (?, ?, ?, ?)',
            [userId, `ratelimit_${action}`, expiresAt.toISOString(), null]
        );
        
        return {
            allowed: true,
            remaining: maxActions - currentCount - 1,
            resetTime: windowStart.getTime() + windowMs
        };
        
    } catch (error) {
        logger.error('Error checking rate limit:', error);
        return {
            allowed: true,
            remaining: maxActions - 1,
            resetTime: Date.now() + windowMs
        };
    }
}

// Clean up cooldowns every 5 minutes
setInterval(cleanupCooldowns, 5 * 60 * 1000);

module.exports = {
    hasPermission,
    checkCooldown,
    setCooldown,
    removeCooldown,
    cleanupCooldowns,
    getUserCooldowns,
    checkRateLimit
};

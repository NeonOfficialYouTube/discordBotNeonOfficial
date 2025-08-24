const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const config = require('./config');
const logger = require('./utils/logger');

let db;

async function initializeDatabase() {
    try {
        db = await open({
            filename: config.database.path,
            driver: sqlite3.Database
        });
        
        // Create tables
        await createTables();
        logger.info('Database connected and tables created');
        
        return db;
    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

async function createTables() {
    // Suggestions table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            suggestion TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            admin_response TEXT
        )
    `);
    
    // Tickets table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            channel_id TEXT UNIQUE,
            category TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            closed_by TEXT
        )
    `);
    
    // Verification table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS verification (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE NOT NULL,
            roblox_id TEXT UNIQUE NOT NULL,
            roblox_username TEXT NOT NULL,
            verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            guild_id TEXT NOT NULL
        )
    `);
    
    // Moderation logs table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS moderation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            target_id TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            reason TEXT,
            duration INTEGER,
            guild_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // User cooldowns table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS cooldowns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            command TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            guild_id TEXT NOT NULL
        )
    `);
}

function getDatabase() {
    return db;
}

module.exports = {
    initializeDatabase,
    getDatabase
};

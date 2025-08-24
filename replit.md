# Discord Bot for Roblox Community Management

## Overview

This is a Discord bot designed specifically for Roblox community management. The bot provides essential moderation tools, user verification with Roblox accounts, a suggestion system with voting capabilities, and a ticket support system. It's built using Discord.js v14 and SQLite for data persistence, making it suitable for managing Discord servers that focus on Roblox gaming communities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Discord.js v14**: Primary framework for Discord API interactions with modern slash commands support
- **Node.js**: Runtime environment with modular command and event handling
- **SQLite**: Local database for persistent data storage using sqlite3 driver

### Command System
- **Slash Commands**: Modern Discord command interface with structured subcommands
- **Command Categories**: 
  - Moderation tools (kick, ban, mute)
  - Suggestion system with voting
  - Ticket management system
  - Roblox account verification
- **Permission-based Access**: Role-based command restrictions with fallback to Discord permissions
- **Cooldown System**: Rate limiting to prevent spam and abuse

### Database Design
- **Suggestions Table**: Stores community suggestions with voting data and admin responses
- **Tickets Table**: Manages support tickets with unique IDs and channel associations
- **Verification Table**: Links Discord accounts to Roblox accounts
- **Cooldowns Table**: Tracks user command usage for rate limiting
- **Moderation Logs**: Records all moderation actions for audit trails

### Event-Driven Architecture
- **Interaction Handler**: Processes slash commands and button interactions
- **Message Monitoring**: Anti-spam detection and message logging
- **Ready Event**: Bot initialization and command registration

### Security & Moderation
- **Role-based Permissions**: Admin and moderator role checking with Discord permission fallbacks
- **Anti-spam Protection**: Message frequency monitoring with automatic muting
- **Audit Logging**: Comprehensive logging system with file-based persistence
- **Cooldown Management**: Prevents command abuse through time-based restrictions

### Configuration Management
- **Environment Variables**: Secure token and API key management
- **Centralized Config**: Single configuration file for all bot settings
- **Channel & Role Mapping**: Configurable Discord server integration points

## External Dependencies

### Discord Integration
- **Discord.js**: Official Discord API library for bot functionality
- **Discord Gateway**: Real-time event handling and bot presence management
- **Discord REST API**: Slash command registration and management

### Roblox Services
- **Roblox Users API**: User information retrieval and username validation
- **Roblox API**: Account verification and user data fetching
- **API Key Authentication**: Secure access to Roblox services

### Data Storage
- **SQLite3**: Local database engine for persistent data storage
- **File System**: Log file management and database file handling

### HTTP Client
- **Axios**: HTTP client for external API requests to Roblox services

### Development Tools
- **File System Monitoring**: Automatic command and event loading
- **Logging System**: Custom logger with file rotation and multiple log levels
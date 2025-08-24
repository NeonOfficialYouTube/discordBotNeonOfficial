const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

// Base URLs for Roblox API
const ROBLOX_API_BASE = 'https://api.roblox.com';
const ROBLOX_USERS_API = 'https://users.roblox.com';

/**
 * Get Roblox user information by username
 * @param {string} username - Roblox username
 * @returns {Object|null} User info object or null if not found
 */
async function getRobloxUserInfo(username) {
    try {
        // First, get user ID from username
        const userSearchResponse = await axios.post(`${ROBLOX_USERS_API}/v1/usernames/users`, {
            usernames: [username],
            excludeBannedUsers: true
        });
        
        if (!userSearchResponse.data.data || userSearchResponse.data.data.length === 0) {
            return null;
        }
        
        const userData = userSearchResponse.data.data[0];
        
        // Get additional user details
        const userDetailsResponse = await axios.get(`${ROBLOX_USERS_API}/v1/users/${userData.id}`);
        
        return {
            id: userData.id,
            name: userData.name,
            displayName: userDetailsResponse.data.displayName,
            description: userDetailsResponse.data.description,
            created: userDetailsResponse.data.created,
            isBanned: userDetailsResponse.data.isBanned
        };
        
    } catch (error) {
        logger.error('Error fetching Roblox user info:', error);
        return null;
    }
}

/**
 * Get Roblox user information by user ID
 * @param {string|number} userId - Roblox user ID
 * @returns {Object|null} User info object or null if not found
 */
async function getRobloxUserById(userId) {
    try {
        const response = await axios.get(`${ROBLOX_USERS_API}/v1/users/${userId}`);
        
        return {
            id: response.data.id,
            name: response.data.name,
            displayName: response.data.displayName,
            description: response.data.description,
            created: response.data.created,
            isBanned: response.data.isBanned
        };
        
    } catch (error) {
        logger.error('Error fetching Roblox user by ID:', error);
        return null;
    }
}

/**
 * Verify Roblox account by checking if verification code is in user's description
 * @param {string|number} userId - Roblox user ID
 * @param {string} verificationCode - Verification code to check for
 * @returns {Object} Verification result
 */
async function verifyRobloxAccount(userId, verificationCode) {
    try {
        const userInfo = await getRobloxUserById(userId);
        
        if (!userInfo) {
            return {
                success: false,
                error: 'Could not fetch Roblox user information'
            };
        }
        
        if (userInfo.isBanned) {
            return {
                success: false,
                error: 'This Roblox account is banned'
            };
        }
        
        const description = userInfo.description || '';
        
        // Check if verification code is in the description
        if (!description.includes(verificationCode)) {
            return {
                success: false,
                error: 'Verification code not found in Roblox profile description. Please ensure you have added the code to your "About" section and try again.'
            };
        }
        
        return {
            success: true,
            username: userInfo.name,
            displayName: userInfo.displayName,
            userId: userInfo.id
        };
        
    } catch (error) {
        logger.error('Error verifying Roblox account:', error);
        return {
            success: false,
            error: 'An error occurred while verifying your account'
        };
    }
}

/**
 * Get Roblox user's groups
 * @param {string|number} userId - Roblox user ID
 * @returns {Array} Array of groups
 */
async function getUserGroups(userId) {
    try {
        const response = await axios.get(`${ROBLOX_API_BASE}/v2/users/${userId}/groups/roles`);
        
        return response.data.data.map(group => ({
            id: group.group.id,
            name: group.group.name,
            description: group.group.description,
            memberCount: group.group.memberCount,
            role: {
                id: group.role.id,
                name: group.role.name,
                rank: group.role.rank
            }
        }));
        
    } catch (error) {
        logger.error('Error fetching user groups:', error);
        return [];
    }
}

/**
 * Check if user is in a specific Roblox group
 * @param {string|number} userId - Roblox user ID
 * @param {string|number} groupId - Roblox group ID
 * @returns {Object|null} Group membership info or null
 */
async function checkGroupMembership(userId, groupId) {
    try {
        const response = await axios.get(`${ROBLOX_API_BASE}/v2/groups/${groupId}/members/${userId}`);
        
        return {
            inGroup: true,
            role: {
                id: response.data.role.id,
                name: response.data.role.name,
                rank: response.data.role.rank
            }
        };
        
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { inGroup: false };
        }
        logger.error('Error checking group membership:', error);
        return null;
    }
}

/**
 * Get user's avatar headshot URL
 * @param {string|number} userId - Roblox user ID
 * @param {string} size - Avatar size (30x30, 48x48, 60x60, 75x75, 100x100, 110x110, 150x150, 180x180, 352x352, 420x420)
 * @returns {string} Avatar URL
 */
function getAvatarUrl(userId, size = '150x150') {
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=${size.split('x')[0]}&height=${size.split('x')[1]}&format=png`;
}

/**
 * Get user's profile URL
 * @param {string|number} userId - Roblox user ID
 * @returns {string} Profile URL
 */
function getProfileUrl(userId) {
    return `https://www.roblox.com/users/${userId}/profile`;
}

module.exports = {
    getRobloxUserInfo,
    getRobloxUserById,
    verifyRobloxAccount,
    getUserGroups,
    checkGroupMembership,
    getAvatarUrl,
    getProfileUrl
};

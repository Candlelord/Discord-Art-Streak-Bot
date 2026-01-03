const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join('./data', 'streaks.json');
const STATS_FILE = path.join('./data', 'stats.json');
const GRACE_PERIOD_DAYS = 1;

// Load data from file
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return {};
    }
}

// Save data to file
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Load stats
function loadStats() {
    try {
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

// Save stats
function saveStats(stats) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// Get today's date string in UTC
function getTodayUTC() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Calculate days difference
function daysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Record an art post
async function recordArtPost(userId, guildId, username) {
    const data = loadData();
    const today = getTodayUTC();
    const key = `${guildId}_${userId}`;

    if (!data[key]) {
        data[key] = {
            userId,
            guildId,
            username,
            currentStreak: 0,
            longestStreak: 0,
            lastPostDate: null,
            totalPosts: 0,
            postDates: []
        };
    }

    const user = data[key];

    // If already posted today, just increment post count
    if (user.lastPostDate === today) {
        user.totalPosts++;
        saveData(data);
        return;
    }

    // Calculate streak
    if (user.lastPostDate) {
        const daysSinceLastPost = daysDifference(user.lastPostDate, today);

        if (daysSinceLastPost === 1) {
            // Consecutive day
            user.currentStreak++;
        } else if (daysSinceLastPost <= GRACE_PERIOD_DAYS + 1) {
            // Within grace period
            user.currentStreak++;
        } else {
            // Streak broken
            user.currentStreak = 1;
        }
    } else {
        user.currentStreak = 1;
    }

    // Update records
    user.lastPostDate = today;
    user.totalPosts++;
    user.postDates.push(today);
    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);

    saveData(data);

    // Update stats
    const stats = loadStats();
    if (!stats[guildId]) stats[guildId] = {};
    if (!stats[guildId][userId]) {
        stats[guildId][userId] = {
            username,
            totalPosts: 0,
            totalReactionsGiven: 0,
            totalCommentsGiven: 0,
            postsByMonth: {},
            milestones: []
        };
    }
    stats[guildId][userId].totalPosts++;
    saveStats(stats);

    console.log(`✅ Recorded art post for ${username}. Streak: ${user.currentStreak} days`);
}

// Check all streaks (runs daily)
async function checkStreaks() {
    const data = loadData();
    const today = getTodayUTC();

    for (const key in data) {
        const user = data[key];
        if (!user.lastPostDate) continue;

        const daysSinceLastPost = daysDifference(user.lastPostDate, today);

        // Break streak if beyond grace period
        if (daysSinceLastPost > GRACE_PERIOD_DAYS + 1 && user.currentStreak > 0) {
            console.log(`🔥 Streak broken for ${user.username}: ${user.currentStreak} days`);
            user.currentStreak = 0;
        }
    }

    saveData(data);
}

// Get leaderboard
async function getLeaderboard(guildId) {
    const data = loadData();
    const users = Object.values(data)
        .filter(u => u.guildId === guildId)
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .slice(0, 10);

    const fields = users.map((u, i) => ({
        name: `${i + 1}. ${u.username}`,
        value: `🔥 ${u.currentStreak} day streak • 📊 ${u.totalPosts} total posts`,
        inline: false
    }));

    return {
        color: 0xFF6B6B,
        title: '🏆 Art Streak Leaderboard',
        description: 'Top artists by current streak',
        fields: fields.length > 0 ? fields : [{ name: 'No data yet', value: 'Start posting art to appear here!' }],
        timestamp: new Date()
    };
}

// Get daily update
async function getDailyUpdate(guildId) {
    const data = loadData();
    const users = Object.values(data).filter(u => u.guildId === guildId);

    const milestones = users.filter(u =>
        [7, 30, 50, 100, 365].includes(u.currentStreak)
    );

    let description = '**Daily Streak Update**\n\n';

    if (milestones.length > 0) {
        description += '🎉 **Milestones Reached Today:**\n';
        milestones.forEach(u => {
            description += `• ${u.username} hit **${u.currentStreak} days**!\n`;
        });
    } else {
        description += 'No major milestones today. Keep posting! 🎨\n';
    }

    const topStreaks = users
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .slice(0, 3);

    if (topStreaks.length > 0) {
        description += '\n🔥 **Top Streaks:**\n';
        topStreaks.forEach((u, i) => {
            description += `${i + 1}. ${u.username}: ${u.currentStreak} days\n`;
        });
    }

    return {
        color: 0x57F287,
        title: '📅 Daily Art Update',
        description,
        timestamp: new Date()
    };
}

// Scan historical messages for 2025
async function scanHistoricalMessages(guild, year) {
    const data = loadData();
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    console.log(`Scanning messages from ${year}...`);

    // Get all threads in the guild
    const threads = await guild.channels.fetchActiveThreads();
    const allThreads = threads.threads;

    for (const thread of allThreads.values()) {
        console.log(`Scanning thread: ${thread.name}`);

        let lastMessageId;
        let fetchedMessages;

        do {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            fetchedMessages = await thread.messages.fetch(options);

            for (const message of fetchedMessages.values()) {
                // Check if message is from target year
                if (message.createdTimestamp < startDate.getTime()) {
                    fetchedMessages.clear(); // Stop fetching older messages
                    break;
                }

                if (message.createdTimestamp > endDate.getTime()) continue;

                // Check for images
                const hasImages = message.attachments.some(att =>
                    att.contentType && att.contentType.startsWith('image/')
                );

                if (hasImages && !message.author.bot) {
                    const dateStr = message.createdAt.toISOString().split('T')[0];
                    const key = `${guild.id}_${message.author.id}`;

                    if (!data[key]) {
                        data[key] = {
                            userId: message.author.id,
                            guildId: guild.id,
                            username: message.author.username,
                            currentStreak: 0,
                            longestStreak: 0,
                            lastPostDate: null,
                            totalPosts: 0,
                            postDates: []
                        };
                    }

                    if (!data[key].postDates.includes(dateStr)) {
                        data[key].postDates.push(dateStr);
                        data[key].totalPosts++;
                    }
                }
            }

            lastMessageId = fetchedMessages.last()?.id;

        } while (fetchedMessages.size === 100);
    }

    // Recalculate streaks based on historical data
    for (const key in data) {
        const user = data[key];
        if (user.postDates.length === 0) continue;

        user.postDates.sort();

        let currentStreak = 1;
        let longestStreak = 1;

        for (let i = 1; i < user.postDates.length; i++) {
            const daysDiff = daysDifference(user.postDates[i - 1], user.postDates[i]);

            if (daysDiff <= GRACE_PERIOD_DAYS + 1) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }

        user.longestStreak = longestStreak;
        user.lastPostDate = user.postDates[user.postDates.length - 1];
    }

    saveData(data);
    console.log('✅ Historical scan complete!');
}

module.exports = {
    recordArtPost,
    checkStreaks,
    getLeaderboard,
    getDailyUpdate,
    scanHistoricalMessages
};

const fs = require('fs');
const path = require('path');

async function generateWrapped(guild, year) {
    const DATA_FILE = path.join('./data', 'streaks.json');
    const STATS_FILE = path.join('./data', 'stats.json');

    const streaks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));

    const guildStreaks = Object.values(streaks).filter(u => u.guildId === guild.id);
    const guildStats = stats[guild.id] || {};

    // Filter posts from target year
    const yearlyData = guildStreaks.map(user => {
        const yearPosts = user.postDates.filter(date =>
            date.startsWith(year.toString())
        );
        return {
            ...user,
            yearlyPosts: yearPosts.length
        };
    }).filter(u => u.yearlyPosts > 0);

    // Calculate stats
    const mostActive = yearlyData.sort((a, b) => b.yearlyPosts - a.yearlyPosts)[0];
    const longestStreak = guildStreaks.sort((a, b) => b.longestStreak - a.longestStreak)[0];

    // Most consistent (posted most unique days)
    const mostConsistent = yearlyData.sort((a, b) =>
        b.postDates.length - a.postDates.length
    )[0];

    // Total server stats
    const totalPosts = yearlyData.reduce((sum, u) => sum + u.yearlyPosts, 0);
    const totalArtists = yearlyData.length;

    const embed = {
        color: 0xFF6B6B,
        title: `🎨 ${year} Art Wrapped - ${guild.name}`,
        description: `A look back at ${year}'s creative journey!`,
        fields: [
            {
                name: '📊 Server Stats',
                value: `**${totalPosts}** total artworks posted\n**${totalArtists}** active artists`,
                inline: false
            },
            {
                name: '🏆 Most Active Artist',
                value: mostActive ? `${mostActive.username} - **${mostActive.yearlyPosts}** posts` : 'N/A',
                inline: true
            },
            {
                name: '🔥 Longest Streak',
                value: longestStreak ? `${longestStreak.username} - **${longestStreak.longestStreak}** days` : 'N/A',
                inline: true
            },
            {
                name: '💎 Most Consistent',
                value: mostConsistent ? `${mostConsistent.username} - **${mostConsistent.postDates.length}** unique days` : 'N/A',
                inline: true
            }
        ],
        footer: {
            text: `${year} was an amazing year for art! Here's to ${year + 1}! 🎉`
        },
        timestamp: new Date()
    };

    return embed;
}

module.exports = {
    generateWrapped
};

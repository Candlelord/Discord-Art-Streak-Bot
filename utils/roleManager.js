const fs = require('fs');
const path = require('path');

// Role tier definitions (Duolingo-inspired)
const ROLE_TIERS = [
    { name: 'Bronze Artist', minStreak: 3, color: 0xCD7F32 },
    { name: 'Silver Artist', minStreak: 7, color: 0xC0C0C0 },
    { name: 'Gold Artist', minStreak: 14, color: 0xFFD700 },
    { name: 'Platinum Artist', minStreak: 30, color: 0xE5E4E2 },
    { name: 'Sapphire Artist', minStreak: 50, color: 0x0F52BA },
    { name: 'Ruby Artist', minStreak: 100, color: 0xE0115F },
    { name: 'Emerald Artist', minStreak: 180, color: 0x50C878 },
    { name: 'Diamond Artist', minStreak: 365, color: 0xB9F2FF },
    { name: 'Cracked Artist', minStreak: 500, color: 0xFF00FF }
];

// Setup roles in guild
async function setupRoles(guild) {
    console.log(`Setting up roles for ${guild.name}...`);

    for (const tier of ROLE_TIERS) {
        let role = guild.roles.cache.find(r => r.name === tier.name);

        if (!role) {
            role = await guild.roles.create({
                name: tier.name,
                color: tier.color,
                reason: 'Art Streak Bot role tier',
                hoist: true // Display separately in member list
            });
            console.log(`✅ Created role: ${tier.name}`);
        } else {
            // Update color if it exists
            await role.edit({ color: tier.color });
            console.log(`Updated role: ${tier.name}`);
        }
    }
}

// Get user's current streak
function getUserStreak(userId, guildId) {
    const DATA_FILE = path.join('./data', 'streaks.json');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const key = `${guildId}_${userId}`;
    return data[key]?.currentStreak || 0;
}

// Update user roles based on streak
async function updateUserRoles(member) {
    const streak = getUserStreak(member.id, member.guild.id);

    // Find appropriate role tier
    const appropriateTier = [...ROLE_TIERS]
        .reverse()
        .find(tier => streak >= tier.minStreak);

    if (!appropriateTier) return;

    // Get all art streak roles
    const allArtRoles = ROLE_TIERS.map(tier =>
        member.guild.roles.cache.find(r => r.name === tier.name)
    ).filter(Boolean);

    // Add the appropriate role
    const targetRole = member.guild.roles.cache.find(r => r.name === appropriateTier.name);
    if (targetRole && !member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole);
        console.log(`✅ Added ${appropriateTier.name} to ${member.user.username}`);
    }

    // Keep all roles but update display color to highest
    // This "stacks" roles but shows the highest tier color
}

module.exports = {
    ROLE_TIERS,
    setupRoles,
    updateUserRoles
};

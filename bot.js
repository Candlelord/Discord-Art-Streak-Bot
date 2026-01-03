const { Client, GatewayIntentBits, Collection } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const streakManager = require('./utils/streakManager');
const roleManager = require('./utils/roleManager');

// Create client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Ensure data directory exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Initialize data files if they don't exist
const initializeDataFiles = () => {
    const files = {
        'streaks.json': {},
        'stats.json': {},
        'config.json': {
            updateChannelId: null,
            artChannels: [],
            roles: roleManager.ROLE_TIERS
        }
    };

    for (const [filename, defaultData] of Object.entries(files)) {
        const filepath = path.join('./data', filename);
        if (!fs.existsSync(filepath)) {
            fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2));
        }
    }
};

initializeDataFiles();

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);

    // Setup roles on all guilds
    for (const guild of client.guilds.cache.values()) {
        await roleManager.setupRoles(guild);
    }

    console.log('🎨 Art Streak Bot is ready!');
});

// Message handler for tracking images
client.on('messageCreate', async (message) => {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Check if message is in a thread
    if (!message.channel.isThread()) return;

    // Check if message has images
    const hasImages = message.attachments.some(att =>
        att.contentType && att.contentType.startsWith('image/')
    );

    if (hasImages) {
        await streakManager.recordArtPost(
            message.author.id,
            message.guild.id,
            message.author.username
        );

        // Update user roles based on new streak
        await roleManager.updateUserRoles(message.member);
    }
});

// Admin commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!art')) return;

    const args = message.content.split(' ');
    const command = args[1];

    // Check if user is admin
    if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ This command requires Administrator permissions.');
    }

    switch(command) {
        case 'setup':
            await setupCommand(message);
            break;
        case 'setchannel':
            await setChannelCommand(message);
            break;
        case 'leaderboard':
            await leaderboardCommand(message);
            break;
        case 'wrapped':
            await wrappedCommand(message, args[2]); // year argument
            break;
        case 'scan2025':
            await scan2025Command(message);
            break;
        case 'help':
            await helpCommand(message);
            break;
        default:
            message.reply('Unknown command. Use `!art help` for available commands.');
    }
});

// Command implementations
async function setupCommand(message) {
    await roleManager.setupRoles(message.guild);
    message.reply('✅ Roles have been set up! The bot is ready to track art streaks.');
}

async function setChannelCommand(message) {
    const config = JSON.parse(fs.readFileSync('./data/config.json', 'utf8'));
    config.updateChannelId = message.channel.id;
    fs.writeFileSync('./data/config.json', JSON.stringify(config, null, 2));
    message.reply('✅ Daily updates will be posted in this channel!');
}

async function leaderboardCommand(message) {
    const leaderboard = await streakManager.getLeaderboard(message.guild.id);
    message.reply({ embeds: [leaderboard] });
}

async function wrappedCommand(message, year) {
    if (!year) year = new Date().getFullYear() - 1;
    message.reply(`🎨 Generating Art Wrapped for ${year}... This may take a moment!`);

    const wrappedGenerator = require('./utils/wrappedGenerator');
    const wrapped = await wrappedGenerator.generateWrapped(message.guild, year);
    message.channel.send({ embeds: [wrapped] });
}

async function scan2025Command(message) {
    message.reply('🔍 Starting to scan 2025 messages... This will take a while!');
    await streakManager.scanHistoricalMessages(message.guild, 2025);
    message.reply('✅ 2025 scan complete! All art posts have been logged.');
}

async function helpCommand(message) {
    const helpEmbed = {
        color: 0x5865F2,
        title: '🎨 Art Streak Bot Commands',
        description: 'Admin commands for managing the art streak bot',
        fields: [
            {
                name: '!art setup',
                value: 'Creates all role tiers for the server'
            },
            {
                name: '!art setchannel',
                value: 'Sets current channel for daily updates'
            },
            {
                name: '!art leaderboard',
                value: 'Shows current streak leaderboard'
            },
            {
                name: '!art wrapped [year]',
                value: 'Generates Art Wrapped for specified year (defaults to previous year)'
            },
            {
                name: '!art scan2025',
                value: 'Scans all 2025 messages to build historical data'
            }
        ],
        footer: {
            text: 'Keep creating art daily to maintain your streak! 🔥'
        }
    };
    message.reply({ embeds: [helpEmbed] });
}

// Daily streak check (runs at midnight UTC)
cron.schedule('0 0 * * *', async () => {
    console.log('🕐 Running daily streak check...');
    await streakManager.checkStreaks();

    // Post daily update
    const config = JSON.parse(fs.readFileSync('./data/config.json', 'utf8'));
    if (config.updateChannelId) {
        for (const guild of client.guilds.cache.values()) {
            const channel = guild.channels.cache.get(config.updateChannelId);
            if (channel) {
                const update = await streakManager.getDailyUpdate(guild.id);
                channel.send({ embeds: [update] });
            }
        }
    }
});

// Login
require('dotenv').config();
client.login(process.env.DISCORD_TOKEN);

# Discord Art Streak Bot

A Discord bot that tracks art posting streaks, assigns roles based on activity, and generates yearly "Art Wrapped" summaries.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create Discord Bot:**
   - Go to https://discord.com/developers/applications
   - Create a new application and add a bot
   - Enable Server Members Intent and Message Content Intent
   - Copy the bot token

3. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```
   DISCORD_TOKEN=your_bot_token_here
   GUILD_ID=your_server_id_here
   ```

4. **Run the bot:**
   ```bash
   npm start
   ```

## Bot Commands

- `!art setup` - Create all role tiers
- `!art setchannel` - Set daily update channel
- `!art leaderboard` - View current streaks
- `!art wrapped [year]` - Generate yearly summary
- `!art scan2025` - Scan historical messages
- `!art help` - Show available commands

## Features

- Tracks art posts in Discord threads
- Automatic role assignment based on streak length
- Daily streak updates and milestone notifications
- Yearly Art Wrapped summaries
- Historical data scanning

## Role Tiers

- Bronze Artist (3+ days)
- Silver Artist (7+ days)
- Gold Artist (14+ days)
- Platinum Artist (30+ days)
- Sapphire Artist (50+ days)
- Ruby Artist (100+ days)
- Emerald Artist (180+ days)
- Diamond Artist (365+ days)
- Cracked Artist (500+ days)

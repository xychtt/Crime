# Crime Bot 🖤

Your all-in-one Discord bot. Built with discord.js v14.

---

## Features

- 🛡️ **Moderation** — ban, kick, warn, timeout, purge
- 🤖 **Auto-mod** — bad word filter, link blocker, anti-spam
- 🔒 **Anti-raid** — auto-kick during mass join events
- 📈 **Leveling** — XP system with level-up messages + leaderboard
- 🎵 **Music** — YouTube playback with queue, skip, pause, resume
- 📊 **Stats Channels** — live member count voice channels
- 📢 **Announcements** — post embeds to any channel
- ⏰ **Reminders** — personal DM reminders
- 🎫 **Tickets** — open/close with auto transcript saved to ticket-logs
- 🎮 **Fun** — polls, giveaways, coinflip, 8ball
- ℹ️ **Info** — userinfo, serverinfo

---

## Setup

### 1. Create your bot on Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it **Crime**
3. Go to **Bot** tab → click **Add Bot**
4. Copy your **Bot Token** (you'll need this)
5. Under **Bot**, enable all three **Privileged Gateway Intents**:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
6. Go to **OAuth2 → URL Generator**
   - Scopes: `bot`
   - Bot Permissions: `Administrator` (or pick specific ones)
7. Open the generated URL and invite Crime to your server

---

### 2. Deploy on Railway (free, 24/7)

1. Push this project to a GitHub repo
2. Go to [railway.app](https://railway.app) and sign up
3. Click **New Project → Deploy from GitHub Repo**
4. Select your repo
5. Go to your project → **Variables** tab and add:

```
BOT_TOKEN=your_token_here
PREFIX=!
MOD_LOG_CHANNEL=mod-logs
WELCOME_CHANNEL=welcome
WELCOME_MESSAGE=Welcome to the server, {user}! 👋
GOODBYE_MESSAGE=**{user}** has left the server.
ANTIRAID_ENABLED=false
ANTIRAID_JOIN_THRESHOLD=10
ANTIRAID_JOIN_WINDOW=10000
```

6. Railway will auto-deploy. That's it — Crime is live 24/7.

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `BOT_TOKEN` | Your bot token (required) | — |
| `PREFIX` | Command prefix | `!` |
| `MOD_LOG_CHANNEL` | Channel name for mod logs | `mod-logs` |
| `WELCOME_CHANNEL` | Channel for welcome/goodbye messages | `welcome` |
| `WELCOME_MESSAGE` | Welcome message (`{user}`, `{server}`, `{count}` supported) | See .env.example |
| `GOODBYE_MESSAGE` | Goodbye message | See .env.example |
| `ANTIRAID_ENABLED` | Enable anti-raid on startup | `false` |
| `ANTIRAID_JOIN_THRESHOLD` | Joins before anti-raid triggers | `10` |
| `ANTIRAID_JOIN_WINDOW` | Time window in ms | `10000` |

### Channels to create in your server

- `#mod-logs` — mod actions are logged here
- `#welcome` — join/leave messages
- `#ticket-logs` — closed ticket transcripts (optional)

---

## Commands

### 🛡️ Moderation
| Command | Description |
|---|---|
| `!ban @user [reason]` | Ban a member |
| `!kick @user [reason]` | Kick a member |
| `!warn @user [reason]` | Warn a member |
| `!warnings @user` | View warnings |
| `!clearwarns @user` | Clear all warnings |
| `!timeout @user 10m [reason]` | Timeout a member |
| `!purge 10` | Delete messages |
| `!automod <on/off/status/links/spam>` | Configure automod |
| `!filter <add/remove/list> [word]` | Manage word filter |
| `!antiraid <on/off/status>` | Toggle anti-raid |

### 🎵 Music
| Command | Description |
|---|---|
| `!play <song>` | Play from YouTube |
| `!skip` | Skip current track |
| `!stop` | Stop and clear queue |
| `!pause` | Pause playback |
| `!resume` | Resume playback |
| `!queue` | View queue |
| `!nowplaying` | Current track |

### ⚙️ Utility
| Command | Description |
|---|---|
| `!rank [@user]` | Check XP rank |
| `!leaderboard` | XP leaderboard |
| `!statschannels` | Create stats voice channels |
| `!announce #channel message` | Post announcement |
| `!remind 10m message` | Set reminder |
| `!userinfo [@user]` | User info |
| `!serverinfo` | Server info |
| `!ticket <topic>` | Open a ticket |
| `!closeticket` | Close & archive ticket |

### 🎮 Fun
| Command | Description |
|---|---|
| `!poll <question>` | Yes/no poll |
| `!giveaway 1h Prize` | Start giveaway |
| `!coinflip` | Flip a coin |
| `!8ball <question>` | Magic 8-ball |

---

## File Structure

```
crime-bot/
├── index.js              # Bot entry point
├── package.json
├── .env.example          # Copy to .env and fill in your token
├── src/
│   ├── commands/
│   │   ├── mod/          # Moderation commands
│   │   ├── music/        # Music commands
│   │   ├── utility/      # Utility + leveling + tickets
│   │   └── fun/          # Fun commands
│   ├── events/           # Discord event handlers
│   ├── utils/            # Shared utilities
│   └── data/             # Auto-created JSON data files
```

---

## Notes

- Data (warnings, XP, tickets, etc.) is stored as JSON files in `src/data/`. For production at scale, consider switching to a database like SQLite or MongoDB.
- Music requires `ffmpeg` — included via `ffmpeg-static`.
- The bot needs `Administrator` permission or at minimum: Manage Messages, Kick/Ban Members, Moderate Members, Manage Channels, Connect, Speak.

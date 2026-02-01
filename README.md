# Morpheus - Telegram Dream Interpretation and Fortune-Telling Bot

**Try the bot:** [https://t.me/MorfejBot](https://t.me/MorfejBot)

## Project Description

**Morpheus** is a multifunctional Telegram bot for dream interpretation and various types of fortune-telling. The project combines esoteric practices, astrology, and numerology in a convenient Telegram interface.

## Core Features

### 📖 Dream Book

#### 1. Keyword Search
- Dream interpretation search by entered word (minimum 3 characters)
- Database with numerous dream interpretations
- Smart search with result caching (TTL 60 minutes)
- Ability to share interpretations with friends
- Automatic splitting of long texts into parts

#### 2. Lunar Dreams
- Dream interpretation based on the current lunar day
- Consideration of astrological rhythms and moon phases
- Calculation based on the `suncalc` library

#### 3. Calendar Dreams
- Dream interpretation by Gregorian calendar date
- Numerological date analysis

### 🔮 Fortune-Telling

#### 1. Yes/No Divination
- Simple binary divination for questions
- Answer in video format
- Ability to share the result

#### 2. Morpheus Speaks
- Receive audio messages from Morpheus
- Visual accompaniment (images)
- Random selection from a collection of messages

#### 3. Time Reading
- Interpretation based on current time
- Analysis of mirror numbers and numerical patterns
- Numerological interpretation

#### 4. Compass of Fate
- Video fortune-telling with direction determination
- Visual representation of fate's choice

#### 5. Voice of the Universe
- Cosmic predictions
- Video with text accompaniment
- Random selection of Universe signs

## Monetization and Limits System

### Fortune-Telling Limits
- **5 free limits** upon new user registration
- **Daily replenishment**: 5 limits every day at 01:00
- Replenishment condition: limits are granted only with zero balance (0 limits and 0 bonuses)
- Limits are not spent on dream book searches - only on fortune-telling

### Referral Program
- **+2 bonuses** to the inviting user for each new referral
- **+2 bonuses** to the new user for following a referral link
- Counter of invited friends
- Bonuses are used as additional limits for fortune-telling
- Automatic notifications about bonus credits

### Premium Features
- Support for premium accounts
- Premium expiration tracking
- Unlimited access to fortune-telling for premium users

## Technical Features

### Technology Stack
- **Node.js** v20.18.2
- **Telegraf** v4.16.3 - framework for Telegram Bot API
- **better-sqlite3** v11.9.1 - high-performance SQLite database
- **bottleneck** v2.19.5 - rate limiting for API requests
- **suncalc** v1.9.0 - calculation of lunar phases and astronomical data
- **dotenv** v16.4.5 - environment variable management

### Database

#### Users Table
- Storage of user information
- Tracking limits and bonuses
- Referral statistics
- Premium status data
- Last activity

#### SearchQueries Table
- Logging of all search queries
- Analytics of popular queries

#### ButtonActions Table
- Tracking of user actions
- Button interaction analytics
- UTM tags for referral program

### Performance Optimization
- **WAL mode** SQLite for parallel read operations
- **Caching** - 10 MB for DB
- **Indexes** on all key fields for fast queries
- **Rate Limiting** through Bottleneck for flood protection
- Automatic cleanup of outdated search results every 5 minutes

### Security System
- Safe Reply/Send wrappers for all messages
- Error handling with graceful degradation
- Input validation (minimum query length)
- Protection against referral duplication (cannot invite oneself)

## Analytics and Monitoring

### Activity Tracking
- Logging of all search queries
- Recording of button interactions
- UTM tags for traffic source tracking
- Referral analytics
- User last activity

### Event Types
- `command` - bot commands
- `menu_button` - menu button clicks
- `fortune_action` - fortune-telling launches
- `share_action` - sharing actions
- `utm_referral_start` - referral link follows

## Administrative Tools

### DB Management Scripts
```bash
npm run export          # Database export
npm run cleanup         # DB cleanup
npm run VACUUM          # DB optimization
npm run adminStats      # Administrator statistics
```

### User Management
```bash
npm run addUser         # Add user
npm run updateUser      # Update user data
npm run deleteUser      # Delete user
npm run updateLimits    # Update premium limits
```

### Performance Testing
```bash
npm run testDB_MaxWrite        # Maximum write load test
npm run testDB_ParallelReads   # Parallel reads test
```

### Development Utilities
```bash
npm run merge           # Merge files
npm run getPS           # Get project structure
```

## Project Structure

```
dream-book-tg-bot/
├── index.js                    # Main bot file
├── data/
│   ├── db.js                  # DB module
│   ├── dataDreams.js          # Dream interpretations database
│   └── database.sqlite        # SQLite database
├── handlers/
│   ├── commandHandlers.js     # Command handlers
│   └── limiter.js             # Rate limiting
├── helpers/
│   ├── keyboards.js           # Bot keyboards
│   ├── searchItems.js         # Search functionality
│   ├── splitText.js           # Long text splitting
│   ├── lunarDay.js            # Lunar day calculation
│   ├── gregorianDay.js        # Calendar operations
│   └── dailyLimitGrant.js     # Daily limit granting
├── fortune_tellings/
│   ├── yes_no/                # Yes/No divination
│   ├── morpheus_says/         # Morpheus speaks
│   ├── time_reading/          # Time reading
│   ├── compass_of_fate/       # Compass of fate
│   └── voice_of_universe/     # Voice of the universe
├── payments/
│   ├── accessControl.js       # Access control
│   └── starPayments.js        # Telegram Stars payments
└── admin/
    ├── DB_Scripts/            # Administrative scripts
    ├── mergeFiles.js          # Merge utility
    └── getProjectStructure.js # Project structure generation
```

## User Interface

### Main Menu
- 📖 Dream Book
- 🔮 Fortune-Telling
- 📋 Instructions
- 👤 My Account

### Navigation
- Intuitive inline buttons
- Ability to return to previous level
- "Remove message" buttons for chat cleanup
- Quick access via Telegram menu button

### Sharing Mechanism
- Referral links for each content type
- UTM tags for source tracking
- Pre-configured sharing messages
- Built-in "Share" buttons in all fortune-tellings

## Notifications

### Automatic Notifications
- Welcome message with limit credits
- Notification about referral bonus credits (to inviter)
- Notification about bonuses to new user
- Daily notification about limit replenishment (at 01:00)
- Access denial messages

### Formatting
- HTML markup for expressiveness
- Emoji for visual design
- Structured information presentation

## Implementation Features

### Middleware
- Automatic `lastActivity` updates for all users
- Passing `referrerId` through `ctx.state` for analytics
- Tracking of all outgoing bot messages

### Graceful Shutdown
- Proper SIGINT and SIGTERM handling
- Safe bot shutdown

### Error Handling
- Try-catch blocks for all critical operations
- Error logging to console
- Fallback messages to users on errors
- Safe wrappers for all Telegram API operations

## Scalability

### Growth Readiness
- Optimized DB queries with indexes
- WAL mode for parallel work
- Rate limiting for overload protection
- Caching of frequently used data

### Modular Architecture
- Separation by functional modules
- Reusable components
- Easy addition of new fortune-tellings
- Centralized keyboard management

## Contacts and Support

**Email**: MorfejBot@proton.me

## Author

**GoldenSpade**

## License

ISC

---

*The project is actively developing and being supplemented with new functionality*

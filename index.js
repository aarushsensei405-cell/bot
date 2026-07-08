// ─────────────────────────────────────────
// GOLDENHEART SMP DISCORD BOT - COMPLETE
// WITH MONGODB PERSISTENT STORAGE
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// ALL IMPORTS FIRST - MUST COME FIRST!
// ─────────────────────────────────────────
// ✅ Add this:
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Automatically looks for process.env.GEMINI_API_KEY or process.env.GOOGLE_API_KEY
// ✅ Add this:
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const express = require('express');
const {
  Client,
  ActivityType,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  AuditLogEvent,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const mongoose = require('mongoose');
const { setupTracking, getTrackingCommands } = require('./trackingIndex');
const { initWelcomeManager, welcomeCommandsData } = require('./welcomeManager'); // <-- ADD THIS LINE
const { initStaffManager, staffCommandsData } = require('./staffManager');
const { casinoCommandsData, handleCasinoInteraction } = require('./casinoManager'); // <-- ADD THIS LINE
const { rrCommandsData, handleRRSetup, handleRRInteraction } = require('./reactionRolesManager'); // <-- ADD THIS LINE
const { 
  aiChatCommandsData, 
  handleAIInteraction,
  handleAIMessage,
} = require('./aiChatManager.js');
require('dotenv').config();

// ─────────────────────────────────────────
// CREATE CLIENT - AFTER ALL IMPORTS!
// ─────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

// ─────────────────────────────────────────
// EXPRESS (keep-alive for Render)
// ─────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ─────────────────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {

  useNewUrlParser: true,

  useUnifiedTopology: true,

})

.then(() => {

  console.log('✅ Connected to MongoDB Atlas!');

  

  // Initialize your welcome manager right here

 initWelcomeManager(client, { GUILD_ID: '1432272831722553398', WELCOME_CHANNEL_ID: '1516255117060341790' });

})

.catch(err => {

  console.error('❌ MongoDB connection error:', err);

  process.exit(1);

});

// ─────────────────────────────────────────
// CONFIG VARIABLES
// ─────────────────────────────────────────
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || '1432272831722553398';

const STAFF_LOG_CHANNEL = process.env.STAFF_LOG_CHANNEL || '1432277470878498866';
const SUGGESTIONS_CHANNEL_ID = process.env.SUGGESTIONS_CHANNEL || '1515769765514313819';
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL || '1516255117060341790';
const STARBOARD_CHANNEL_ID = process.env.STARBOARD_CHANNEL || '1432277447440597028';
const BIRTHDAY_CHANNEL_ID = process.env.BIRTHDAY_CHANNEL || '1432277447440597028';
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY || '1518439159189213225';
const LEVEL_UP_CHANNEL_ID = process.env.LEVEL_UP_CHANNEL || '1432277463366504484';

const SHOP_COMPLETED_USER_ID = process.env.SHOP_COMPLETED_USER || '1519764530425495643';
const SERVER_OWNER_ID = process.env.SERVER_OWNER || '885470207332728832';

const VERIFY_CHANNEL_ID = process.env.VERIFY_CHANNEL || '1513364198850171010';
const VERIFY_ROLE_ID = process.env.VERIFY_ROLE || '1432277416109281371';
const BIRTHDAY_ROLE_ID = process.env.BIRTHDAY_ROLE || '1432277416109281371';

const SPAM_SETTINGS = {
  duplicateMessageLimit: 4,
  duplicateWindowMs: 10000,
  rapidMessageLimit: 10,
  rapidWindowMs: 5000,
  linkSpamLimit: 3,
  timeoutMinutes: 10,
};
const MOD_ROLE_IDS = (process.env.MOD_ROLES || '1432277404864483390,1432277404046331984').split(',');

const STAFF_MEMBERS = {
  gray: { id: '935050795299250197', label: 'Gray', type: 'Chat Moderator' },
  mayehm: { id: '750704207434088489', label: 'Mayehm', type: 'Helper' },
  iceflows: { id: '1394287232029954108', label: 'IceFlows', type: 'Helper' },
  mncikdb: { id: '1092762008371339365', label: 'MNCIKDB', type: 'MC Chat Moderator' },
  viking2001: { id: '1215370954709008385', label: 'Viking2001', type: 'MC Chat Moderator' },
};

const APP_ROLES = {
  chatmod: process.env.CHATMOD_ROLE || '1433055763051446272',
  helper: process.env.HELPER_ROLE || '1432277404864483390',
  mcmod: process.env.MCMOD_ROLE || '1432278296347021352',
};
const APP_NAMES = {
  chatmod: 'Chat Moderator',
  helper: 'Helper',
  mcmod: 'Minecraft Chat Moderator',
};

const STARBOARD_THRESHOLD = 3;

// ─────────────────────────────────────────
// SHOP CONFIGURATION
// ─────────────────────────────────────────
const SHOP_CATEGORIES = {
  food: {
    name: '🌿 Food & Resources',
    emoji: '🌿',
    items: [
      { id: 'bread', name: '🍞 Bread', amount: 16, price: 75, description: '16 Bread' },
      { id: 'apples', name: '🍎 Apples', amount: 16, price: 75, description: '16 Apples' },
      { id: 'cooked_beef', name: '🥩 Cooked Beef', amount: 16, price: 125, description: '16 Cooked Beef' },
      { id: 'wheat', name: '🌾 Wheat', amount: 32, price: 100, description: '32 Wheat' },
      { id: 'logs', name: '🪵 Logs', amount: 32, price: 150, description: '32 Logs (Any Type)' },
    ]
  },
  materials: {
    name: '⛏️ Materials',
    emoji: '⛏️',
    items: [
      { id: 'cobblestone', name: '🪨 Cobblestone', amount: 64, price: 50, description: '64 Cobblestone' },
      { id: 'planks', name: '🪵 Wood Planks', amount: 64, price: 100, description: '64 Wood Planks' },
      { id: 'coal', name: '⚫ Coal', amount: 32, price: 175, description: '32 Coal' },
      { id: 'iron_ingots', name: '🔩 Iron Ingots', amount: 16, price: 350, description: '16 Iron Ingots' },
      { id: 'gold_ingots', name: '✨ Gold Ingots', amount: 8, price: 300, description: '8 Gold Ingots' },
      { id: 'diamonds', name: '💎 Diamonds', amount: 2, price: 500, description: '2 Diamonds' },
    ]
  },
  tools: {
    name: '🔧 Tools',
    emoji: '🔧',
    items: [
      { id: 'iron_pickaxe', name: '⛏️ Iron Pickaxe', amount: 1, price: 350, description: 'Iron Pickaxe' },
      { id: 'iron_axe', name: '🪓 Iron Axe', amount: 1, price: 300, description: 'Iron Axe' },
      { id: 'iron_sword', name: '⚔️ Iron Sword', amount: 1, price: 350, description: 'Iron Sword' },
      { id: 'bow', name: '🏹 Bow', amount: 1, price: 500, description: 'Bow' },
      { id: 'arrows', name: '➡️ Arrows', amount: 32, price: 150, description: '32 Arrows' },
    ]
  },
  armor: {
    name: '🛡️ Armor',
    emoji: '🛡️',
    items: [
      { id: 'iron_helmet', name: '🪖 Iron Helmet', amount: 1, price: 500, description: 'Iron Helmet' },
      { id: 'iron_chestplate', name: '🛡️ Iron Chestplate', amount: 1, price: 900, description: 'Iron Chestplate' },
      { id: 'iron_leggings', name: '👖 Iron Leggings', amount: 1, price: 750, description: 'Iron Leggings' },
      { id: 'iron_boots', name: '👢 Iron Boots', amount: 1, price: 450, description: 'Iron Boots' },
      { id: 'diamond_helmet', name: '💎 Diamond Helmet', amount: 1, price: 2500, description: 'Diamond Helmet' },
      { id: 'diamond_chestplate', name: '💎 Diamond Chestplate', amount: 1, price: 4500, description: 'Diamond Chestplate' },
      { id: 'diamond_leggings', name: '💎 Diamond Leggings', amount: 1, price: 4000, description: 'Diamond Leggings' },
      { id: 'diamond_boots', name: '💎 Diamond Boots', amount: 1, price: 2000, description: 'Diamond Boots' },
    ]
  },
  miscellaneous: {
    name: '🎁 Miscellaneous',
    emoji: '🎁',
    items: [
      { id: 'bed', name: '🛏️ Bed', amount: 1, price: 100, description: 'Bed' },
      { id: 'shulker_box', name: '📦 Shulker Box', amount: 1, price: 2000, description: 'Shulker Box' },
      { id: 'torches', name: '🕯️ Torches', amount: 16, price: 50, description: '16 Torches' },
      { id: 'compass', name: '🧭 Compass', amount: 1, price: 300, description: 'Compass' },
      { id: 'water_bucket', name: '🪣 Water Bucket', amount: 1, price: 150, description: 'Water Bucket' },
    ]
  }
};

// ─────────────────────────────────────────
// COINS SYSTEM CONFIG
// ─────────────────────────────────────────
const COINS_PER_MESSAGE = 0.2;
const COINS_PER_VC_MINUTE = 1;
const COINS_PER_INVITE = 50;
const COINS_COOLDOWN_MS = 10000;
const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 60000;

// ─────────────────────────────────────────
// APPLICATION QUESTIONS
// ─────────────────────────────────────────
const QUESTIONS = {
  chatmod: [
    { key: 'discord', q: '**[1/6]** What is your Discord username?' },
    { key: 'age', q: '**[2/6]** How old are you?' },
    { key: 'timezone', q: '**[3/6]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours', q: '**[4/6]** How many hours per day can you be active?' },
    { key: 'why', q: '**[5/6]** Why do you want to be a **Chat Moderator**? *(min 50 chars)*' },
    { key: 'scenario', q: '**[6/6]** A player is spamming slurs in chat. What do you do?' },
  ],
  helper: [
    { key: 'discord', q: '**[1/6]** What is your Discord username?' },
    { key: 'age', q: '**[2/6]** How old are you?' },
    { key: 'timezone', q: '**[3/6]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours', q: '**[4/6]** How many hours per day can you be active?' },
    { key: 'why', q: '**[5/6]** Why do you want to be a **Helper**? *(min 50 chars)*' },
    { key: 'experience', q: '**[6/6]** Do you have any previous experience helping on servers?' },
  ],
  mcmod: [
    { key: 'discord', q: '**[1/7]** What is your Discord username?' },
    { key: 'mcuser', q: '**[2/7]** What is your Minecraft username?' },
    { key: 'age', q: '**[3/7]** How old are you?' },
    { key: 'timezone', q: '**[4/7]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours', q: '**[5/7]** How many hours per day can you be active on the MC server?' },
    { key: 'why', q: '**[6/7]** Why do you want to be a **Minecraft Chat Moderator**? *(min 50 chars)*' },
    { key: 'scenario', q: '**[7/7]** A player is using a hack client and spamming chat. What do you do?' },
  ],
};

// ─────────────────────────────────────────
// MONGODB SCHEMAS
// ─────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  coins: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  invites: { type: Number, default: 0 },
  lastDaily: Date,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
});

const PurchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  itemId: String,
  amount: Number,
  price: Number,
  category: String,
  completed: { type: Boolean, default: false },
  couponCode: String,
  originalPrice: Number,
  purchasedAt: { type: Date, default: Date.now },
});

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  amount: Number,
  type: String,
  maxUses: Number,
  usedCount: { type: Number, default: 0 },
  expiresAt: Date,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  items: [{
    itemId: String,
    categoryKey: String,
    quantity: { type: Number, default: 1 }
  }],
  couponCode: String,
  updatedAt: { type: Date, default: Date.now },
});

const WarnSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  reason: String,
  warnedBy: String,
  timestamp: { type: Date, default: Date.now },
});

const FeedbackSchema = new mongoose.Schema({
  staffKey: String,
  staffLabel: String,
  staffType: String,
  fromUserId: String,
  fromUsername: String,
  rating: Number,
  comment: String,
  timestamp: { type: Date, default: Date.now },
});

const SuggestionSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  fromUserId: String,
  fromUsername: String,
  text: String,
  status: { type: String, default: 'pending' },
  timestamp: { type: Date, default: Date.now },
});

const TempBanSchema = new mongoose.Schema({
  userId: String,
  userTag: String,
  guildId: String,
  reason: String,
  duration: String,
  unbanAt: Date,
});

const BirthdaySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  day: Number,
  month: Number,
  lastAnnounced: String,
});

const TicketSchema = new mongoose.Schema({
  channelId: String,
  userId: String,
  ticketNumber: Number,
  type: String,
  claimedBy: String,
  closed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const StarboardSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  starboardMessageId: String,
  channelId: String,
  starCount: { type: Number, default: 0 },
});

const GiveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  prize: String,
  winners: Number,
  winnersList: [String],
  hostId: String,
  endsAt: Date,
  ended: { type: Boolean, default: false },
});

const ReminderSchema = new mongoose.Schema({
  userId: String,
  text: String,
  fireAt: Date,
});

const AFKSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  reason: String,
  since: { type: Date, default: Date.now },
});

const InviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  inviterId: String,
  uses: { type: Number, default: 0 },
  maxUses: Number,
  createdAt: Date,
});

const ApplicationSchema = new mongoose.Schema({
  id: String,
  userId: String,
  userTag: String,
  role: String,
  answers: mongoose.Schema.Types.Mixed,
  submittedAt: { type: Date, default: Date.now },
});

const RulebookSchema = new mongoose.Schema({
  bookKey: { type: String, required: true, unique: true },
  title: String,
  color: Number,
  pages: [{
    title: String,
    content: String,
  }],
});

// ─────────────────────────────────────────
// MONGODB MODELS
// ─────────────────────────────────────────
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
const Warn = mongoose.models.Warn || mongoose.model('Warn', WarnSchema);
const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
const Suggestion = mongoose.models.Suggestion || mongoose.model('Suggestion', SuggestionSchema);
const TempBan = mongoose.models.TempBan || mongoose.model('TempBan', TempBanSchema);
const Birthday = mongoose.models.Birthday || mongoose.model('Birthday', BirthdaySchema);
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
const Starboard = mongoose.models.Starboard || mongoose.model('Starboard', StarboardSchema);
const Giveaway = mongoose.models.Giveaway || mongoose.model('Giveaway', GiveawaySchema);
const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);
const AFK = mongoose.models.AFK || mongoose.model('AFK', AFKSchema);
const Invite = mongoose.models.Invite || mongoose.model('Invite', InviteSchema);
const Application = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
const Rulebook = mongoose.models.Rulebook || mongoose.model('Rulebook', RulebookSchema);
// ─────────────────────────────────────────
// DEFAULT RULEBOOKS
// ─────────────────────────────────────────
const DEFAULT_RULEBOOKS = {
  mc: {
    title: '⚔️ GoldenHeart SMP — Minecraft Rules',
    color: 0x57f287,
    pages: [
      {
        title: '🌍 Page 1 — Spawn Rules',
        content: '> By playing on GoldenHeart SMP, you agree to follow all rules. Attempting to bypass, exploit, or abuse loopholes is punishable.\n\n**1.1 No Spawn Killing**\nKilling, trapping, baiting, crystaling, lava trapping, TNT trapping, or otherwise harming players at or near spawn is prohibited. Staff-approved events are the only exception.\n\n**1.2 No Spawn Griefing**\nDo not destroy, alter, steal from, or place blocks at spawn. If spawn protection fails, it is still against the rules. Report issues to staff immediately.\n\n**1.3 No Spawn Camping**\nRepeatedly waiting at spawn to kill, follow, or target players is prohibited.\n\n**1.4 No Spawn Traps**\nAny trap designed to kill, damage, trap, or inconvenience players near spawn is prohibited.\n\n**1.5 No Claim Blocking**\nDo not intentionally build around spawn in a way that limits expansion, movement, or future server projects.',
      },
      {
        title: '⚔️ Page 2 — PvP & Combat Rules',
        content: '**2.1 No Combat Logging**\nLogging out during PvP is prohibited. Switching accounts, disconnecting, crashing your client, or using any method to avoid death counts as combat logging.\n🔴 **Punishment:** 1 Day Ban. Inventory may be removed or awarded to the opponent.\n\n**2.2 No /Back Abuse**\n/back may not be used to escape combat or instantly return to a fight after dying.\n\n**2.3 No Bed Trap Logging**\nLogging out while trapped or surrounded in combat is considered combat logging.\n\n**2.4 No Alt Combat Abuse**\nUsing alternate accounts to gain combat advantages is prohibited.\n\n**2.5 No Kill Farming**\nFarming kills, stats, bounties, or rewards using teammates, friends, or alts is prohibited.\n\n**2.6 No Exploit PvP**\nAny bug, glitch, or unintended mechanic used to gain a combat advantage is prohibited.\n\n**2.7 No Safezone Abuse**\nDo not repeatedly enter protected areas or spawn to avoid combat.',
      },
      {
        title: '🏰 Page 3 — Raiding & Griefing',
        content: '**3.1 Raiding Is Allowed** ✅\nBases may be raided unless otherwise stated by staff.\n\n**3.2 Griefing Is Allowed** ✅\nBase destruction is allowed as part of raiding.\n\n**3.3 No Server-Damaging Grief**\nExcessive lag-causing destruction, world corruption attempts, or actions intended to harm server performance are prohibited.\n\n**3.4 No Exploit Raiding**\nRaiding through glitches, bugs, duplication, chunk exploits, or unintended mechanics is prohibited.\n\n**3.5 No Offline Abuse Exploits**\nIntentionally abusing plugin bugs or protection failures against offline players is prohibited.',
      },
      {
        title: '👥 Page 4 — Team Rules',
        content: '**4.1 Maximum Team Size: 6 Players**\n\n**4.2 Hidden Teaming Allowed** ✅\nSecret alliances, temporary alliances, diplomacy, and betrayals are all allowed.\n\n**4.3 No Team Limit Bypass**\nSplitting into multiple teams while operating as one large group is prohibited.\n\n**4.4 No Mass Alliances**\nMultiple teams cannot permanently cooperate to bypass the team limit.\n\n**4.5 No Alt Teams**\nAlternate accounts count toward team size limits.\n\n**4.6 Staff May Investigate Teaming**\nShared bases, shared storage, coordinated attacks, voice communication, and resource sharing may all be used as evidence.',
      },
      {
        title: '🚫 Page 5 — Cheating & Exploits',
        content: '**5.1 No Cheats** — Including but not limited to:\n> X-Ray • ESP • Tracers • Kill Aura • Reach • Auto Crystal • Auto Totem • Fly Hacks • Speed Hacks • NoSlow • Anti-Knockback • Triggerbot • Aim Assist • Macros • Scripts • Autoclickers • Modified clients\n\n**5.2 No Exploits:**\n> Dupes • Chunk exploits • Plugin bugs • Server bugs • Client exploits • Glitches • Packet abuse • Any unintended mechanic\n\n**5.3 Report Bugs**\nBugs must be reported immediately. Abuse of bugs is punishable even if not listed.\n\n**5.4 No Lag Machines**\nAny machine designed to create lag, crashes, TPS drops, or server instability is prohibited.\n\n**5.5 No Crash Attempts**\nAttempts to crash players, staff, Discord bots, or the server are prohibited.\n\n**5.6 No Ban Evasion**\nJoining on alternate accounts after punishment is prohibited.',
      },
    ],
  },
  chat: {
    title: '💬 GoldenHeart SMP — Chat Rules',
    color: 0xf0b429,
    pages: [
      {
        title: '💬 Page 1 — Spam, Swearing & Harassment',
        content: '**6.1 No Spam**\n> No flooding chat • No excessive caps • No repeated messages • No meaningless spam\n\n**6.2 Swearing Policy**\nCasual swearing is allowed. Directed swearing is **NOT** allowed.\n\n✅ **Allowed:**\n> *"This boss fight is f***ing hard."*\n> *"That was bad luck."*\n\n❌ **Not Allowed:**\n> *"You\'re f***ing trash."*\n> *"Shut the f*** up."*\n\nDirected insults, harassment, and personal attacks are all prohibited.\n\n**6.3 No Harassment**\nRepeated targeting, bullying, stalking, or provoking players is prohibited.',
      },
      {
        title: '🚨 Page 2 — Hate Speech, Threats & NSFW',
        content: '**6.4 No Hate Speech** 🚨 SEVERE\n> Racism • Nationality insults • Religious insults • Cultural insults • Ethnic discrimination\n\n🔴 **Result:** Immediate 1-Day Timeout minimum. Severe cases may skip directly to bans.\n\n**6.5 No Threats**\nReal-life threats are prohibited. Doxxing threats are prohibited.\n\n**6.6 No NSFW Content**\n> Sexual content • Pornography • Explicit media • Inappropriate usernames or skins\n\n**6.7 No Advertising**\nAdvertising servers, communities, websites, or services without staff permission is prohibited.\n\n**6.8 No Impersonation**\nPretending to be staff, content creators, or other players is prohibited.',
      },
    ],
  },
  general: {
    title: '📜 GoldenHeart SMP — General Rules',
    color: 0xed4245,
    pages: [
      {
        title: '⚠️ Page 1 — Warning System',
        content: '> Warnings are applied progressively. Staff may skip levels depending on severity.\n\n```\nWarn 1 → Verbal Warning / Minor Punishment\nWarn 2 → 30 Minute Timeout\nWarn 3 → 6 Hour Timeout\nWarn 4 → 1 Day Timeout\nWarn 5 → 3 Day Timeout\nWarn 6 → 7 Day Timeout (Final Warning)\nWarn 7 → Permanent Ban\n```',
      },
      {
        title: '👑 Page 2 — Staff Rules',
        content: '**8.1 Respect Staff**\nYou may disagree respectfully. Harassment of staff is prohibited.\n\n**8.2 No False Reports**\nIntentionally false reports may result in punishment.\n\n**8.3 Staff Decisions Are Final**\nPublic arguments after a final decision may result in additional punishment.\n\n**8.4 Punishment Evasion**\nUsing alts, VPNs, or other methods to avoid punishments is prohibited.',
      },
      {
        title: '⚖️ Page 3 — General Rules & Golden Rule',
        content: '**9.1 Common Sense Rule**\nNot every possible offense can be listed. Staff may punish behavior that clearly harms the server or provides an unfair advantage.\n\n**9.2 No Loophole Abuse**\n"The rules didn\'t specifically say I couldn\'t" is not a valid defense. Attempting to bypass the intent of any rule is punishable.\n\n**9.3 No Real-Life Harm**\nDoxxing, leaking personal information, blackmail, or encouraging self-harm is strictly prohibited.\n\n**9.4 English Preferred**\nStaff must be able to moderate conversations when necessary.\n\n**9.5 Cooperation Required**\nRefusing staff investigations, evidence requests, or cheat checks may result in punishment.\n\n**9.6 The Golden Rule** ❤️\n> *Don\'t ruin the experience for other players.*\n\n*These rules are enforced based on both their wording and intended purpose. Play fair. Have fun. Win legitimately. — Golden Heart SMP Staff Team*',
      },
    ],
  },
};

let RULEBOOKS = DEFAULT_RULEBOOKS;
let rulebooksLoaded = false;
// ─────────────────────────────────────────
// AI MESSAGE HANDLER (GEMINI)
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// RULEBOOK FUNCTIONS
// ─────────────────────────────────────────
async function saveRulebooks(rulebooks) {
  for (const [key, book] of Object.entries(rulebooks)) {
    await Rulebook.findOneAndUpdate(
      { bookKey: key },
      { title: book.title, color: book.color, pages: book.pages },
      { upsert: true }
    );
  }
}

async function loadRulebooks() {
  const stored = await Rulebook.find({}).lean();
  const result = {};
  for (const book of stored) {
    result[book.bookKey] = {
      title: book.title,
      color: book.color,
      pages: book.pages,
    };
  }
  return result;
}

async function initializeRulebooks() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise(resolve => {
        if (mongoose.connection.readyState === 1) resolve();
        mongoose.connection.once('connected', resolve);
      });
    }
    
    const stored = await loadRulebooks();
    if (Object.keys(stored).length > 0) {
      RULEBOOKS = stored;
      console.log('✅ Rulebooks loaded from database');
    } else {
      await saveRulebooks(DEFAULT_RULEBOOKS);
      console.log('✅ Default rulebooks saved to database');
    }
    rulebooksLoaded = true;
    return RULEBOOKS;
  } catch (err) {
    console.error('❌ Failed to initialize rulebooks:', err);
    RULEBOOKS = DEFAULT_RULEBOOKS;
    rulebooksLoaded = true;
    return RULEBOOKS;
  }
}

// ─────────────────────────────────────────
// SHOP UI BUILDERS
// ─────────────────────────────────────────
function buildShopEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🪙 Golden Coins Shop')
    .setColor(0xf0b429)
    .setDescription([
      'Welcome to the **Golden Coins Shop**! 🛒',
      '',
      'Use the dropdown below to browse different categories.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '💡 **How to earn coins:**',
      '• 💬 **5 messages** = 1 coin',
      '• 🎤 **1 minute in VC** = 1 coin',
      '• 📨 **1 invite** = 50 coins',
      '• 🎁 **Daily claim** = 50 coins',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🛒 **Cart System:** Add items to your cart and checkout together!',
      '🎫 **Coupon Codes:** Use discount codes at checkout!',
      '',
      '⚠️ **Shop prices may change** based on the server economy.',
      '💛 **Use your coins wisely** — every purchase matters!',
    ].join('\n'))
    .setFooter({ text: 'GoldenHeart SMP • Shop' })
    .setTimestamp();

  return embed;
}

function buildCategoryEmbed(categoryKey) {
  const category = SHOP_CATEGORIES[categoryKey];
  if (!category) return null;

  const itemsList = category.items.map((item, index) =>
    `\`${String(index + 1).padStart(2, ' ')}\` ${item.name} — **${item.price}** coins`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.name}`)
    .setColor(0xf0b429)
    .setDescription([
      `Select an item from the dropdown below to purchase!`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      itemsList,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `💳 **Click the dropdown** to choose an item and add to cart.`,
    ].join('\n'))
    .setFooter({ text: 'GoldenHeart SMP • Shop' })
    .setTimestamp();

  return embed;
}

function buildCategorySelectMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('shop_category')
    .setPlaceholder('📂 Select a category to browse...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('🌿 Food & Resources')
        .setDescription('Food and resource items')
        .setEmoji('🌿')
        .setValue('food'),
      new StringSelectMenuOptionBuilder()
        .setLabel('⛏️ Materials')
        .setDescription('Building materials and ores')
        .setEmoji('⛏️')
        .setValue('materials'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🔧 Tools')
        .setDescription('Weapons and tools')
        .setEmoji('🔧')
        .setValue('tools'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🛡️ Armor')
        .setDescription('Protective gear')
        .setEmoji('🛡️')
        .setValue('armor'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🎁 Miscellaneous')
        .setDescription('Other useful items')
        .setEmoji('🎁')
        .setValue('miscellaneous'),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildItemSelectMenu(categoryKey) {
  const category = SHOP_CATEGORIES[categoryKey];
  if (!category) return null;

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`shop_item_${categoryKey}`)
    .setPlaceholder('🛒 Select an item to add to cart...');

  category.items.forEach(item => {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${item.name} — ${item.price} coins`)
        .setDescription(`${item.amount}x ${item.name.replace(/[^\w\s]/g, '').trim()}`)
        .setValue(item.id)
    );
  });

  return new ActionRowBuilder().addComponents(menu);
}

function buildBackButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('shop_back')
      .setLabel('◀ Back to Categories')
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildCartButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('shop_cart_view')
      .setLabel('🛒 View Cart')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('shop_back')
      .setLabel('◀ Back')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ─────────────────────────────────────────
// BOOK / PAGINATED EMBED SYSTEM
// ─────────────────────────────────────────
function buildBookEmbed(bookTitle, pages, pageIndex, color) {
  const page = pages[pageIndex];
  return new EmbedBuilder()
    .setTitle(page.title)
    .setDescription(page.content)
    .setColor(color)
    .setFooter({ text: `📖 ${bookTitle}  •  Page ${pageIndex + 1} of ${pages.length}` })
    .setTimestamp();
}

function buildBookRow(pageIndex, totalPages, bookKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`book_prev:${bookKey}:${pageIndex}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId(`book_page:${bookKey}:${pageIndex}`)
      .setLabel(`${pageIndex + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`book_next:${bookKey}:${pageIndex}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === totalPages - 1),
  );
}

// ─────────────────────────────────────────
// WELCOME CARD IMAGE GENERATOR
// ─────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circleClip(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

async function generateWelcomeCard(member) {
  const width = 1000;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a0a1a');
  bgGradient.addColorStop(0.3, '#2d0a2d');
  bgGradient.addColorStop(0.6, '#3d1a2d');
  bgGradient.addColorStop(0.8, '#1a1a0a');
  bgGradient.addColorStop(1, '#0a1a0a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const grassColors = ['#6b8c42', '#5a7d32', '#7a9c52', '#4a6d22'];
  for (let x = 0; x < width; x += 20) {
    for (let y = height - 30; y < height; y += 20) {
      const shade = grassColors[Math.floor(Math.random() * grassColors.length)];
      ctx.fillStyle = shade;
      ctx.fillRect(x + Math.random() * 10 - 5, y + Math.random() * 10 - 5, 20, 20);
    }
  }

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 2 + Math.random() * 4;
    ctx.fillStyle = `rgba(60, 40, 30, ${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(x, y, size, size);
  }

  const heartX = 80, heartY = 80;
  ctx.shadowColor = '#f0b429';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#f0b429';
  ctx.font = '60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❤️', heartX, heartY);
  ctx.shadowBlur = 0;

  ctx.shadowColor = '#f0b429';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#ffd76e';
  ctx.font = 'bold 52px "Minecraft", "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOLDENHEART SMP', 150, 70);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Minecraft", "Courier New", monospace';
  ctx.fillText('⚔️ SURVIVAL MULTIPLAYER', 150, 120);

  ctx.fillStyle = '#8a8a8a';
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️', width / 2, 170);

  const textX = 60;
  const textY = 180;

  let displayName = member.user.username;
  if (displayName.length > 16) displayName = displayName.slice(0, 14) + '…';

  ctx.shadowColor = '#f0b429';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Minecraft", "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayName, textX, textY);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f0b429';
  ctx.font = '20px "Minecraft", "Courier New", monospace';
  ctx.fillText(`✦ Member #${member.guild.memberCount}`, textX, textY + 45);

  const infoY = 250;
  const infoBoxes = [
    { icon: '⛏️', label: 'Minecraft', value: '1.20.4+' },
    { icon: '🌐', label: 'IP', value: 'goldenheartsmp.minecraftnoob.com' },
    { icon: '👥', label: 'Online', value: `${member.guild.memberCount} Players` },
  ];

  infoBoxes.forEach((box, i) => {
    const x = textX + i * 280;
    roundRect(ctx, x, infoY, 250, 60, 8);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
    roundRect(ctx, x, infoY, 250, 60, 8);
    ctx.strokeStyle = 'rgba(240, 180, 41, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f0b429';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${box.icon} ${box.label}`, x + 10, infoY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(box.value, x + 10, infoY + 45);
  });

  const avatarSize = 130;
  const avatarX = width - 170;
  const avatarY = height / 2 - 10;

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarImg = await loadImage(avatarURL);

    ctx.save();
    ctx.shadowColor = '#f0b429';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 8, 0, Math.PI * 2);
    const ringGrad = ctx.createRadialGradient(
      avatarX - 40, avatarY - 40, 10,
      avatarX, avatarY, avatarSize / 2 + 12
    );
    ringGrad.addColorStop(0, '#ffd76e');
    ringGrad.addColorStop(0.5, '#f0b429');
    ringGrad.addColorStop(1, '#b8860b');
    ctx.fillStyle = ringGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    circleClip(ctx, avatarX, avatarY, avatarSize / 2);
    ctx.drawImage(avatarImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f0b429';
    ctx.font = 'bold 16px "Minecraft", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ WELCOME ✦', avatarX, avatarY + avatarSize / 2 + 30);
  } catch {
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.font = '12px "Minecraft", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('🏰 GoldenHeart SMP • discord.gg/We5SpWv64T • ⛏️ 1.20.4+', width / 2, height - 10);

  const corners = [[20, 20], [width - 20, 20], [20, height - 20], [width - 20, height - 20]];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#f0b429';
    ctx.font = '16px sans-serif';
    ctx.textAlign = cx < 50 ? 'left' : 'right';
    ctx.textBaseline = cy < 50 ? 'top' : 'bottom';
    ctx.fillText('◆', cx, cy);
  });

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getTimeoutDuration(warnCount) {
  if (warnCount < 3) return null;
  if (warnCount >= 8) return 28 * 24 * 60;
  return 30 + (warnCount - 3) * 15;
}

function hasModPermission(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return MOD_ROLE_IDS.some(id => member.roles.cache.has(id));
}

function isGuildOwner(interaction) {
  return interaction.guild?.ownerId === interaction.user.id;
}

function isServerOwner(userId) {
  return userId === SERVER_OWNER_ID;
}

function autoDelete(sentMessage, ms = 5000) {
  if (!sentMessage) return;
  setTimeout(() => sentMessage.delete().catch(() => { }), ms);
}

function starsDisplay(n) {
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return value * (map[unit] || 0);
}

function humanDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'GoldenHeart-Bot/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}

async function getMCServerStatus(host, port = 25565) {
  try {
    const data = await fetchJSON(`https://api.mcsrvstat.us/3/${host}:${port}`);
    return data;
  } catch {
    return null;
  }
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ─────────────────────────────────────────
// LOG HELPER
// ─────────────────────────────────────────
async function sendLog(client, embed) {
  try {
    const ch = await client.channels.fetch(STAFF_LOG_CHANNEL);
    await ch.send({ embeds: [embed] });
  } catch (err) {
    console.error('Log send error:', err);
  }
}

// ─────────────────────────────────────────
// GIVEAWAY HELPER
// ─────────────────────────────────────────
async function endGiveaway(client, giveaway) {
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);
    const reaction = message.reactions.cache.get('🎉');
    if (!reaction) {
      await channel.send(`🎉 Giveaway for **${giveaway.prize}** ended — no valid entries!`);
      return;
    }
    const users = await reaction.users.fetch();
    const eligible = users.filter(u => !u.bot).map(u => u);
    if (eligible.length === 0) {
      await channel.send(`🎉 Giveaway for **${giveaway.prize}** ended — no valid entries!`);
      return;
    }
    const winnerCount = Math.min(giveaway.winners, eligible.length);
    const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, winnerCount);
    const winnerMentions = shuffled.map(u => `<@${u.id}>`).join(', ');
    const endEmbed = EmbedBuilder.from(message.embeds[0])
      .setColor(0x57f287)
      .setTitle('🎉 GIVEAWAY ENDED')
      .setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winner${winnerCount > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations!`)
      .setFooter({ text: `Ended` })
      .setTimestamp();
    await message.edit({ embeds: [endEmbed], components: [] });
    await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
    await Giveaway.findOneAndUpdate(
      { messageId: giveaway.messageId },
      { ended: true, winnersList: shuffled.map(u => u.id) }
    );
  } catch (err) {
    console.error('Giveaway end error:', err);
  }
}

// ─────────────────────────────────────────
// BIRTHDAY CHECK
// ─────────────────────────────────────────
async function checkBirthdays(client) {
  const now = new Date();
  const todayDay = now.getUTCDate();
  const todayMonth = now.getUTCMonth() + 1;
  const allBirthdays = await Birthday.find({}).lean();
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  
  for (const birthday of allBirthdays) {
    if (birthday.day === todayDay && birthday.month === todayMonth) {
      if (birthday.lastAnnounced === `${todayMonth}-${todayDay}-${now.getUTCFullYear()}`) continue;
      try {
        const member = await guild.members.fetch(birthday.userId).catch(() => null);
        if (!member) continue;
        if (BIRTHDAY_ROLE_ID) {
          await member.roles.add(BIRTHDAY_ROLE_ID).catch(() => { });
          setTimeout(async () => { await member.roles.remove(BIRTHDAY_ROLE_ID).catch(() => { }); }, 86400000);
        }
        const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null);
        if (channel) {
          await channel.send(`🎂 **Happy Birthday, <@${birthday.userId}>!** 🎉\n\nWishing you an amazing day from everyone at **GoldenHeart SMP**! 🥳🎈`);
        }
        await Birthday.findOneAndUpdate(
          { userId: birthday.userId },
          { lastAnnounced: `${todayMonth}-${todayDay}-${now.getUTCFullYear()}` }
        );
      } catch (err) {
        console.error('Birthday announcement error:', err);
      }
    }
  }
}

// ─────────────────────────────────────────
// REMINDER CHECK
// ─────────────────────────────────────────
async function checkReminders(client) {
  const dueReminders = await Reminder.find({ fireAt: { $lt: new Date() } }).lean();
  for (const reminder of dueReminders) {
    try {
      const user = await client.users.fetch(reminder.userId);
      await user.send(`⏰ **Reminder!**\n\n${reminder.text}`);
    } catch { }
    await Reminder.deleteOne({ _id: reminder._id });
  }
}

// ─────────────────────────────────────────
// TEMP BAN CHECK
// ─────────────────────────────────────────
async function checkTempBans(client) {
  const now = new Date();
  await TempBan.deleteMany({ unbanAt: { $lt: now } });
  const activeBans = await TempBan.find({ unbanAt: { $gt: now } }).lean();
  
  for (const ban of activeBans) {
    if (now >= ban.unbanAt) {
      try {
        const guild = client.guilds.cache.get(ban.guildId);
        if (guild) {
          await guild.members.unban(ban.userId, 'Temporary ban expired');
          const logEmbed = new EmbedBuilder()
            .setTitle('🔓 Temp Ban Expired — Auto Unbanned').setColor(0x57f287)
            .addFields(
              { name: 'User', value: `<@${ban.userId}> (${ban.userTag})`, inline: true },
              { name: 'Original Duration', value: ban.duration, inline: true },
            ).setTimestamp();
          await sendLog(client, logEmbed);
        }
      } catch { }
    }
  }
}

// ─────────────────────────────────────────
// DATABASE HELPER FUNCTIONS
// ─────────────────────────────────────────
async function getUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId });
    await user.save();
  }
  return user;
}

async function getCoins(userId) {
  const user = await getUser(userId);
  return user.coins;
}

async function addCoins(userId, username, amount) {
  const user = await getUser(userId);
  user.username = username || user.username;
  user.coins += amount;
  await user.save();
  return user.coins;
}

async function setCoins(userId, username, amount) {
  const user = await getUser(userId);
  user.username = username || user.username;
  user.coins = amount;
  await user.save();
  return user.coins;
}

async function getCoinsLeaderboard(limit = 10) {
  return await User.find({ coins: { $gt: 0 } })
    .sort({ coins: -1 })
    .limit(limit)
    .lean();
}

async function getXP(userId) {
  const user = await getUser(userId);
  return user.xp;
}

async function addXP(userId, username, amount) {
  const user = await getUser(userId);
  user.username = username || user.username;
  user.xp += amount;
  const newLevel = getLevelFromXP(user.xp);
  if (newLevel > user.level) {
    user.level = newLevel;
  }
  await user.save();
  return { xp: user.xp, level: user.level };
}

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getLevelFromXP(totalXP) {
  let level = 0;
  while (xpForLevel(level + 1) <= totalXP) level++;
  return level;
}

async function recordPurchase(userId, username, itemId, amount, price, category, couponCode = null, originalPrice = null) {
  const purchase = new Purchase({
    userId,
    username: username || 'Unknown',
    itemId,
    amount,
    price,
    category,
    completed: false,
    couponCode,
    originalPrice,
  });
  await purchase.save();
  return purchase;
}

async function getUserPurchases(userId) {
  return await Purchase.find({ userId }).sort({ purchasedAt: -1 }).lean();
}

async function updatePurchaseStatus(purchaseId, completed) {
  const purchase = await Purchase.findById(purchaseId);
  if (purchase) {
    purchase.completed = completed;
    await purchase.save();
    return true;
  }
  return false;
}

async function getTotalSpent(userId) {
  const purchases = await Purchase.find({ userId });
  return purchases.reduce((total, p) => total + p.price, 0);
}

// ── COUPON FUNCTIONS ──
function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createCoupon(amount, type, maxUses = null, expiresAt = null) {
  const code = generateCouponCode();
  const coupon = new Coupon({
    code,
    amount,
    type,
    maxUses,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    active: true,
  });
  await coupon.save();
  return code;
}

async function validateCoupon(code) {
  const coupon = await Coupon.findOne({ code, active: true });
  if (!coupon) return { valid: false, message: 'Coupon not found or inactive' };
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, message: 'Coupon has reached its maximum uses' };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, message: 'Coupon has expired' };
  }
  return { valid: true, coupon };
}

async function useCoupon(code) {
  const coupon = await Coupon.findOne({ code });
  if (coupon) {
    coupon.usedCount += 1;
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      coupon.active = false;
    }
    await coupon.save();
    return true;
  }
  return false;
}

function calculateDiscount(subtotal, coupon) {
  if (coupon.type === 'fixed') {
    return Math.min(coupon.amount, subtotal);
  } else if (coupon.type === 'percent') {
    return Math.floor(subtotal * (coupon.amount / 100));
  }
  return 0;
}

// ── CART FUNCTIONS ──
async function loadCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
    await cart.save();
  }
  return cart;
}

async function addToCart(userId, itemId, categoryKey, quantity = 1) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }
  
  const existing = cart.items.find(i => i.itemId === itemId && i.categoryKey === categoryKey);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ itemId, categoryKey, quantity });
  }
  cart.updatedAt = new Date();
  await cart.save();
  return cart;
}

async function removeFromCart(userId, itemIndex) {
  const cart = await Cart.findOne({ userId });
  if (cart && cart.items[itemIndex]) {
    cart.items.splice(itemIndex, 1);
    cart.updatedAt = new Date();
    await cart.save();
    return true;
  }
  return false;
}

async function clearCart(userId) {
  await Cart.findOneAndUpdate(
    { userId },
    { items: [], couponCode: null, updatedAt: new Date() },
    { upsert: true }
  );
}

async function getCartTotal(userId) {
  const cart = await loadCart(userId);
  let total = 0;
  const items = [];
  
  for (const item of cart.items) {
    const category = SHOP_CATEGORIES[item.categoryKey];
    if (category) {
      const shopItem = category.items.find(i => i.id === item.itemId);
      if (shopItem) {
        const subtotal = shopItem.price * item.quantity;
        total += subtotal;
        items.push({ ...shopItem, quantity: item.quantity, subtotal, categoryKey: item.categoryKey });
      }
    }
  }
  return { total, items };
}

async function applyCouponToCart(userId, couponCode) {
  const cart = await Cart.findOne({ userId });
  if (!cart) return { success: false, message: 'Cart not found' };
  
  const validation = await validateCoupon(couponCode);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  cart.couponCode = couponCode;
  cart.updatedAt = new Date();
  await cart.save();
  return { success: true, coupon: validation.coupon };
}

async function getCartWithDiscount(userId) {
  const cart = await loadCart(userId);
  const { total, items } = await getCartTotal(userId);
  let discount = 0;
  let couponData = null;
  
  if (cart.couponCode) {
    const validation = await validateCoupon(cart.couponCode);
    if (validation.valid) {
      discount = calculateDiscount(total, validation.coupon);
      couponData = validation.coupon;
    } else {
      cart.couponCode = null;
      await cart.save();
    }
  }
  
  return { total, items, discount, finalTotal: total - discount, coupon: couponData };
}

// ── WARN FUNCTIONS ──
async function addWarn(userId, username, reason, warnedBy) {
  const warn = new Warn({
    userId,
    username,
    reason,
    warnedBy,
  });
  await warn.save();
  return warn;
}

async function getWarns(userId) {
  return await Warn.find({ userId }).sort({ timestamp: -1 }).lean();
}

async function removeLastWarn(userId) {
  const warns = await Warn.find({ userId }).sort({ timestamp: -1 });
  if (warns.length > 0) {
    await Warn.deleteOne({ _id: warns[0]._id });
    return true;
  }
  return false;
}

async function clearWarns(userId) {
  await Warn.deleteMany({ userId });
}

async function getWarnCount(userId) {
  return await Warn.countDocuments({ userId });
}

// ── FEEDBACK FUNCTIONS ──
async function addFeedback(staffKey, staffLabel, staffType, fromUserId, fromUsername, rating, comment) {
  const feedback = new Feedback({
    staffKey,
    staffLabel,
    staffType,
    fromUserId,
    fromUsername,
    rating,
    comment: comment || '',
  });
  await feedback.save();
  return feedback;
}

async function getFeedbackForStaff(staffKey) {
  return await Feedback.find({ staffKey }).sort({ timestamp: -1 }).lean();
}

async function getStaffStats() {
  const stats = {};
  const allFeedback = await Feedback.find({}).lean();
  
  for (const fb of allFeedback) {
    if (!stats[fb.staffKey]) {
      stats[fb.staffKey] = {
        label: fb.staffLabel,
        type: fb.staffType,
        ratings: [],
        count: 0,
      };
    }
    stats[fb.staffKey].ratings.push(fb.rating);
    stats[fb.staffKey].count++;
  }
  
  return stats;
}

// ── SUGGESTION FUNCTIONS ──
async function createSuggestion(fromUserId, fromUsername, text) {
  const id = 'SUG-' + Date.now().toString(36).toUpperCase();
  const suggestion = new Suggestion({
    id,
    fromUserId,
    fromUsername,
    text,
    status: 'pending',
  });
  await suggestion.save();
  return suggestion;
}

async function updateSuggestionStatus(id, status) {
  const suggestion = await Suggestion.findOne({ id });
  if (suggestion) {
    suggestion.status = status;
    await suggestion.save();
    return suggestion;
  }
  return null;
}

// ── BIRTHDAY FUNCTIONS ──
async function setBirthday(userId, username, day, month) {
  await Birthday.findOneAndUpdate(
    { userId },
    { username, day, month, lastAnnounced: null },
    { upsert: true }
  );
}

async function removeBirthday(userId) {
  await Birthday.deleteOne({ userId });
}

async function getBirthday(userId) {
  return await Birthday.findOne({ userId }).lean();
}

// ── TEMP BAN FUNCTIONS ──
async function addTempBan(userId, userTag, guildId, reason, duration, unbanAt) {
  const ban = new TempBan({
    userId,
    userTag,
    guildId,
    reason,
    duration,
    unbanAt: new Date(unbanAt),
  });
  await ban.save();
  return ban;
}

async function getActiveTempBans() {
  const now = new Date();
  return await TempBan.find({ unbanAt: { $gt: now } }).lean();
}

async function removeExpiredTempBans() {
  const now = new Date();
  await TempBan.deleteMany({ unbanAt: { $lt: now } });
}

// ── TICKET FUNCTIONS ──
async function createTicket(channelId, userId, ticketNumber, type) {
  const ticket = new Ticket({
    channelId,
    userId,
    ticketNumber,
    type,
    closed: false,
  });
  await ticket.save();
  return ticket;
}

async function closeTicket(channelId) {
  await Ticket.findOneAndUpdate(
    { channelId },
    { closed: true, claimedBy: null }
  );
}

async function claimTicket(channelId, claimedBy) {
  await Ticket.findOneAndUpdate(
    { channelId },
    { claimedBy }
  );
}

// ── STARBOARD FUNCTIONS ──
async function setStarboardMessage(messageId, starboardMessageId, channelId) {
  await Starboard.findOneAndUpdate(
    { messageId },
    { starboardMessageId, channelId },
    { upsert: true }
  );
}

async function getStarboardMessage(messageId) {
  return await Starboard.findOne({ messageId }).lean();
}

// ── GIVEAWAY FUNCTIONS ──
async function createGiveaway(messageId, channelId, prize, winners, hostId, endsAt) {
  const giveaway = new Giveaway({
    messageId,
    channelId,
    prize,
    winners,
    hostId,
    endsAt: new Date(endsAt),
    ended: false,
  });
  await giveaway.save();
  return giveaway;
}

async function endGiveawayDb(messageId, winnersList) {
  await Giveaway.findOneAndUpdate(
    { messageId },
    { ended: true, winnersList }
  );
}

// ── REMINDER FUNCTIONS ──
async function createReminder(userId, text, fireAt) {
  const reminder = new Reminder({
    userId,
    text,
    fireAt: new Date(fireAt),
  });
  await reminder.save();
  return reminder;
}

async function getDueReminders() {
  const now = new Date();
  return await Reminder.find({ fireAt: { $lt: now } }).lean();
}

async function deleteReminder(id) {
  await Reminder.deleteOne({ _id: id });
}

// ── AFK FUNCTIONS ──
async function setAFK(userId, username, reason) {
  await AFK.findOneAndUpdate(
    { userId },
    { username, reason, since: new Date() },
    { upsert: true }
  );
}

async function removeAFK(userId) {
  await AFK.deleteOne({ userId });
}

async function getAFK(userId) {
  return await AFK.findOne({ userId }).lean();
}

async function getAllAFK() {
  return await AFK.find({}).lean();
}

// ── APPLICATION FUNCTIONS ──
async function saveApplication(role, entry) {
  const app = new Application({
    id: entry.id,
    userId: entry.userId,
    userTag: entry.userTag,
    role,
    answers: entry.answers,
    submittedAt: new Date(),
  });
  await app.save();
  return app;
}

// ── INVITE FUNCTIONS ──
async function trackInvite(code, inviterId, maxUses) {
  await Invite.findOneAndUpdate(
    { code },
    { inviterId, maxUses, uses: 0 },
    { upsert: true }
  );
}

async function updateInviteUses(code, uses) {
  await Invite.findOneAndUpdate(
    { code },
    { uses }
  );
}

// ─────────────────────────────────────────
// CLIENT READY EVENT
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// CLIENT READY EVENT - FIXED
// ─────────────────────────────────────────
client.once('ready', async () => {  // <-- ADDED 'async'
  console.log(`✅ ${client.user.tag} is online`);
  client.user.setPresence({
    activities: [{ name: 'players in GoldenHeart SMP', type: ActivityType.Watching }],
    status: 'dnd',
  });
  
  // Initialize rulebooks
  await initializeRulebooks();
  
  // Initialize staff manager
  initStaffManager(client);
  
  // Load giveaways
  const giveaways = await Giveaway.find({ ended: false });
  const now = Date.now();
  for (const g of giveaways) {
    const remaining = g.endsAt.getTime() - now;
    if (remaining <= 0) { await endGiveaway(client, g); }
    else { setTimeout(() => endGiveaway(client, g), remaining); }
  }
  
  // ── SETUP TRACKING ──
  const { voiceTracker, inviteTracker } = setupTracking(client, GUILD_ID);
  
  // Store trackers globally for commands
  client.voiceTracker = voiceTracker;
  client.inviteTracker = inviteTracker;
  
  // Start intervals
  setInterval(() => checkBirthdays(client), 3600000);
  setInterval(() => checkReminders(client), 30000);
  setInterval(() => checkTempBans(client), 60000);
  checkBirthdays(client);
});

// ─────────────────────────────────────────
// CLIENT ERROR EVENTS
// ─────────────────────────────────────────
client.on('error', err => console.error('❌ CLIENT ERROR:', err));
client.on('shardError', err => console.error('❌ SHARD ERROR:', err));
client.on('shardDisconnect', () => console.warn('⚠️ Shard disconnected'));

// ─────────────────────────────────────────
// SPAM CLEANUP INTERVAL
// ─────────────────────────────────────────
const messageHistory = new Map();
const spamCooldown = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [userId, history] of messageHistory.entries()) {
    const trimmed = history.filter(m => now - m.timestamp <= 15000);
    if (trimmed.length === 0) messageHistory.delete(userId);
    else messageHistory.set(userId, trimmed);
  }
  for (const [userId, ts] of spamCooldown.entries()) {
    if (now - ts > 15000) spamCooldown.delete(userId);
  }
}, 30000);

// ─────────────────────────────────────────
// SPAM DETECTION
// ─────────────────────────────────────────
function checkSpam(message) {
  const userId = message.author.id;
  const now = Date.now();
  const content = message.content;
  const linkMatches = content.match(/https?:\/\/\S+/gi) || [];
  if (linkMatches.length >= SPAM_SETTINGS.linkSpamLimit) {
    return { type: 'link_spam', detail: `${linkMatches.length} links in one message`, matchedMessages: [message] };
  }
  if (!messageHistory.has(userId)) messageHistory.set(userId, []);
  const history = messageHistory.get(userId);
  history.push({ content, timestamp: now, message });
  const trimmed = history.filter(m => now - m.timestamp <= 15000);
  messageHistory.set(userId, trimmed);
  const recentRapid = trimmed.filter(m => now - m.timestamp <= SPAM_SETTINGS.rapidWindowMs);
  if (recentRapid.length >= SPAM_SETTINGS.rapidMessageLimit) {
    return { type: 'rapid_flood', detail: `${recentRapid.length} messages within ${SPAM_SETTINGS.rapidWindowMs / 1000}s`, matchedMessages: recentRapid.map(m => m.message) };
  }
  const recentDup = trimmed.filter(m => now - m.timestamp <= SPAM_SETTINGS.duplicateWindowMs);
  const sameContent = recentDup.filter(m => m.content === content && content.length > 0);
  if (sameContent.length >= SPAM_SETTINGS.duplicateMessageLimit) {
    return { type: 'duplicate_spam', detail: `Same message repeated ${sameContent.length} times within ${SPAM_SETTINGS.duplicateWindowMs / 1000}s`, matchedMessages: sameContent.map(m => m.message) };
  }
  return null;
}

// ─────────────────────────────────────────
// ACTIVE SESSIONS
// ─────────────────────────────────────────
const activeSessions = new Map();
const pendingFeedback = new Map();
const pollVotes = new Map();
const xpCooldown = new Map();
const coinsCooldown = new Map();
const voiceTracking = new Map();

const STAR_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
const recentJoins = [];
const RAID_THRESHOLD = 5;
const RAID_WINDOW_MS = 10000;
let raidLockActive = false;

// ─────────────────────────────────────────
// ANTI-RAID & MEMBER JOIN
// ─────────────────────────────────────────
client.on('guildMemberAdd', async member => {
  if (member.guild.id !== GUILD_ID) return;
  
  // ── RAID DETECTION ──
  const now = Date.now();
  recentJoins.push(now);
  while (recentJoins.length > 0 && now - recentJoins[0] > RAID_WINDOW_MS) recentJoins.shift();
  if (recentJoins.length >= RAID_THRESHOLD && !raidLockActive) {
    raidLockActive = true;
    try {
      const channels = member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
      for (const [, ch] of channels) {
        await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: false }).catch(() => { });
      }
    } catch (err) { console.error('Raid lock error:', err); }
    const raidEmbed = new EmbedBuilder()
      .setTitle('🚨 RAID DETECTED — Server Locked').setColor(0xff0000)
      .setDescription(`**${recentJoins.length} accounts joined within ${RAID_WINDOW_MS / 1000} seconds.**\n\nAll text channels have been locked for @everyone.\nUse \`/unlock\` to re-open channels once the situation is resolved.`)
      .setTimestamp();
    await sendLog(client, raidEmbed);
    try {
      const logCh = await client.channels.fetch(STAFF_LOG_CHANNEL);
      await logCh.send(`🚨 <@&${MOD_ROLE_IDS[0]}> **RAID ALERT** — server has been auto-locked!`);
    } catch { }
    setTimeout(async () => {
      raidLockActive = false;
      try {
        const channels = member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        for (const [, ch] of channels) {
          await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: null }).catch(() => { });
        }
        const logCh = await client.channels.fetch(STAFF_LOG_CHANNEL);
        await logCh.send('✅ Raid lock auto-removed after 5 minutes. Monitor the server.');
      } catch { }
    }, 300000);
  }

  // ── INVITE TRACKING ──
  try {
    const invites = await member.guild.invites.fetch();
    for (const [code, invite] of invites) {
      const storedInvite = await Invite.findOne({ code });
      if (storedInvite && invite.uses > storedInvite.uses) {
        const inviterId = invite.inviter.id;
        const user = await getUser(inviterId);
        user.username = invite.inviter.tag;
        user.coins += COINS_PER_INVITE;
        user.invites += 1;
        await user.save();
        
        storedInvite.uses = invite.uses;
        await storedInvite.save();
        
        console.log(`Awarded ${COINS_PER_INVITE} coins to ${invite.inviter.tag} for inviting ${member.user.tag}`);
        try {
          const inviter = await client.users.fetch(inviterId);
          await inviter.send(`🎉 **You earned ${COINS_PER_INVITE} coins!**\n\n${member.user.tag} joined using your invite link! 🏆`);
        } catch (err) {
          console.log(`Could not DM inviter ${inviterId}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Error tracking invite:', err);
  }

  // ── LOG JOIN ──
  const embed = new EmbedBuilder()
    .setTitle('📥 Member Joined').setColor(0x57f287)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
  await sendLog(client, embed);

  // ── WELCOME CARD ──
});

// ─────────────────────────────────────────
// MEMBER LEAVE
// ─────────────────────────────────────────
client.on('guildMemberRemove', async member => {
  if (member.guild.id !== GUILD_ID) return;
  const embed = new EmbedBuilder()
    .setTitle('📤 Member Left').setColor(0xed4245)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'User', value: `${member.user.tag}`, inline: true },
      { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
  await sendLog(client, embed);
});

// ─────────────────────────────────────────
// MESSAGE DELETE
// ─────────────────────────────────────────
client.on('messageDelete', async message => {
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (message.author?.bot) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Message Deleted').setColor(0xfee75c)
    .addFields(
      { name: 'Author', value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Unknown', inline: true },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      { name: 'Content', value: message.content?.slice(0, 1024) || '*[no text content]*', inline: false },
    )
    .setFooter({ text: `Message ID: ${message.id}` }).setTimestamp();
  await sendLog(client, embed);
});

// ─────────────────────────────────────────
// MESSAGE UPDATE
// ─────────────────────────────────────────
client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.guild.id !== GUILD_ID) return;
  if (oldMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;
  const embed = new EmbedBuilder()
    .setTitle('✏️ Message Edited').setColor(0x5865f2)
    .addFields(
      { name: 'Author', value: `<@${oldMsg.author?.id}> (${oldMsg.author?.tag})`, inline: true },
      { name: 'Channel', value: `<#${oldMsg.channelId}>`, inline: true },
      { name: 'Before', value: oldMsg.content?.slice(0, 512) || '*empty*', inline: false },
      { name: 'After', value: newMsg.content?.slice(0, 512) || '*empty*', inline: false },
    )
    .setFooter({ text: `[Jump to message](${newMsg.url})` }).setTimestamp();
  await sendLog(client, embed);
});

// ─────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────
client.on('guildAuditLogEntryCreate', async (entry, guild) => {
  if (guild.id !== GUILD_ID) return;
  if (entry.action === AuditLogEvent.MemberBanAdd) {
    const embed = new EmbedBuilder()
      .setTitle('🔨 Member Banned').setColor(0xed4245)
      .addFields(
        { name: 'Banned User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
        { name: 'Reason', value: entry.reason ?? 'No reason provided', inline: false },
      )
      .setFooter({ text: `Target ID: ${entry.targetId}` }).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberBanRemove) {
    const embed = new EmbedBuilder()
      .setTitle('🔓 Member Unbanned').setColor(0x57f287)
      .addFields(
        { name: 'User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberKick) {
    const embed = new EmbedBuilder()
      .setTitle('👢 Member Kicked').setColor(0xffa500)
      .addFields(
        { name: 'Kicked User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
        { name: 'Reason', value: entry.reason ?? 'No reason provided', inline: false },
      )
      .setFooter({ text: `Target ID: ${entry.targetId}` }).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberUpdate) {
    const timedOut = entry.changes?.find(c => c.key === 'communication_disabled_until');
    if (!timedOut) return;
    const isTimeout = !!timedOut.new;
    const embed = new EmbedBuilder()
      .setTitle(isTimeout ? '⏱️ Member Timed Out' : '✅ Timeout Removed')
      .setColor(isTimeout ? 0xfee75c : 0x57f287)
      .addFields(
        { name: 'User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
        ...(isTimeout ? [{ name: 'Until', value: `<t:${Math.floor(new Date(timedOut.new).getTime() / 1000)}:F>`, inline: true }] : []),
        { name: 'Reason', value: entry.reason ?? 'No reason provided', inline: false },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    const added = entry.changes?.filter(c => c.key === '$add').flatMap(c => c.new) ?? [];
    const removed = entry.changes?.filter(c => c.key === '$remove').flatMap(c => c.new) ?? [];
    const lines = [...added.map(r => `➕ <@&${r.id}> added`), ...removed.map(r => `➖ <@&${r.id}> removed`)].join('\n');
    if (!lines) return;
    const embed = new EmbedBuilder()
      .setTitle('🎭 Member Roles Updated').setColor(0x9b59b6)
      .addFields(
        { name: 'User', value: `<@${entry.targetId}>`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
        { name: 'Changes', value: lines, inline: false },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.ChannelCreate) {
    const embed = new EmbedBuilder()
      .setTitle('📢 Channel Created').setColor(0x57f287)
      .addFields(
        { name: 'Name', value: `#${entry.target?.name ?? 'unknown'}`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.ChannelDelete) {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Channel Deleted').setColor(0xed4245)
      .addFields(
        { name: 'Name', value: `#${entry.target?.name ?? 'unknown'}`, inline: true },
        { name: 'By', value: `<@${entry.executorId}>`, inline: true },
      ).setTimestamp();
    await sendLog(client, embed);
  }
});

// ─────────────────────────────────────────
// VOICE STATE TRACKING
// ─────────────────────────────────────────
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.guild.id !== GUILD_ID) return;
  const member = newState.member || oldState.member;
  if (member?.user.bot) return;

  let title, color, fields;
  if (!oldState.channelId && newState.channelId) {
    title = '🔊 Voice Joined'; color = 0x57f287;
    fields = [{ name: 'Channel', value: `<#${newState.channelId}>`, inline: true }];
  } else if (oldState.channelId && !newState.channelId) {
    title = '🔇 Voice Left'; color = 0xed4245;
    fields = [{ name: 'Channel', value: `<#${oldState.channelId}>`, inline: true }];
  } else if (oldState.channelId !== newState.channelId) {
    title = '🔀 Voice Moved'; color = 0x5865f2;
    fields = [
      { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
      { name: 'To', value: `<#${newState.channelId}>`, inline: true },
    ];
  }

  const userId = member.user.id;

  if (newState.channelId && !oldState.channelId) {
    voiceTracking.set(userId, {
      startTime: Date.now(),
      channelId: newState.channelId
    });
    console.log(`Started tracking voice for ${member.user.tag}`);
  }

  if (!newState.channelId && oldState.channelId) {
    const tracking = voiceTracking.get(userId);
    if (tracking) {
      const elapsedMs = Date.now() - tracking.startTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      if (elapsedMinutes >= 1) {
        const coinsToAdd = elapsedMinutes * COINS_PER_VC_MINUTE;
        const user = await getUser(userId);
        user.username = member.user.tag;
        user.coins += coinsToAdd;
        user.voiceMinutes += elapsedMinutes;
        await user.save();
        console.log(`Awarded ${coinsToAdd} coins to ${member.user.tag} for ${elapsedMinutes} minutes in voice chat`);
      }
      voiceTracking.delete(userId);
    }
  }

  if (title) {
    const embed = new EmbedBuilder()
      .setTitle(title).setColor(color)
      .addFields({ name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true }, ...fields)
      .setTimestamp();
    await sendLog(client, embed);
  }
});

// ─────────────────────────────────────────
// INVITE CREATE TRACKING
// ─────────────────────────────────────────
client.on('inviteCreate', async (invite) => {
  await trackInvite(invite.code, invite.inviter.id, invite.maxUses);
});

// ─────────────────────────────────────────
// TICKET TYPES
// ─────────────────────────────────────────
const TICKET_TYPES = {
  support: {
    label: 'General Support',
    emoji: '🎟️',
    color: 0xf0b429,
    prefix: 'support',
    intro: 'Describe your issue in detail and a staff member will assist you shortly.',
  },
  shop: {
    label: 'Shop & Purchases',
    emoji: '🛍️',
    color: 0x57f287,
    prefix: 'shop',
    intro: 'Need help with shop purchases, rewards, or item claims? Share your details here.',
  },
};

async function openTicket(interaction, ticketTypeKey = 'support') {
  const type = TICKET_TYPES[ticketTypeKey] || TICKET_TYPES.support;
  const userId = interaction.user.id;
  
  const existingTicket = await Ticket.findOne({ userId, closed: false });
  if (existingTicket) {
    return interaction.reply({ content: `❌ You already have an open ticket: <#${existingTicket.channelId}>`, ephemeral: true });
  }
  
  try {
    const ticketCount = await Ticket.countDocuments();
    const ticketNumber = ticketCount + 1;
    const ticketName = `${type.prefix}-${ticketNumber.toString().padStart(4, '0')}`;
    
    const channel = await interaction.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ...MOD_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
      ],
    });
    
    await createTicket(channel.id, userId, ticketNumber, ticketTypeKey);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close:${channel.id}`)
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket_claim:${channel.id}`)
        .setLabel('🙋 Claim Ticket')
        .setStyle(ButtonStyle.Primary),
    );

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`${type.emoji}  ${type.label} — Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setColor(type.color)
      .setDescription([
        `> Welcome <@${userId}>! 👋`,
        `> `,
        `> ${type.intro}`,
        `> `,
        `> Staff will be with you **as soon as possible**.`,
        `> Please be patient and **don't ping staff** repeatedly.`,
      ].join('\n'))
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }) || interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🎫 Ticket ID', value: `\`#${ticketNumber.toString().padStart(4, '0')}\``, inline: true },
        { name: '📂 Category', value: `${type.emoji} ${type.label}`, inline: true },
        { name: '👤 Opened By', value: `<@${userId}>`, inline: true },
        { name: '📅 Opened At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        { name: '📋 Instructions', value: [
          '**1.** Describe your issue clearly',
          '**2.** Attach any screenshots or evidence',
          '**3.** Wait for a staff member to respond',
          '**4.** Use the Close button when resolved',
        ].join('\n'), inline: false },
      )
      .setFooter({ text: 'GoldenHeart SMP • Support Desk  •  Only you and staff can see this' })
      .setTimestamp();

    await channel.send({
      content: `<@${userId}> <@&${MOD_ROLE_IDS[0]}>`,
      embeds: [ticketEmbed],
      components: [closeRow],
    });
    return interaction.reply({ content: `✅ Your ticket has been opened: <#${channel.id}>`, ephemeral: true });
  } catch (err) {
    console.error('Ticket open error:', err);
    return interaction.reply({ content: '❌ Failed to create ticket channel.', ephemeral: true });
  }
}
// ─────────────────────────────────────────
// MESSAGE REACTION ADD (Starboard, Polls, Feedback)
// ─────────────────────────────────────────
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

  // ── STARBOARD ──
  if (reaction.emoji.name === '⭐' && reaction.message.guild?.id === GUILD_ID) {
    const starCount = reaction.count;
    if (starCount < STARBOARD_THRESHOLD) return;
    const starboardData = await getStarboardMessage(reaction.message.id);
    
    if (starboardData) {
      try {
        const sbChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID);
        const sbMsg = await sbChannel.messages.fetch(starboardData.starboardMessageId);
        const updatedEmbed = EmbedBuilder.from(sbMsg.embeds[0])
          .setFooter({ text: `⭐ ${starCount} | #${reaction.message.channel.name}` });
        await sbMsg.edit({ embeds: [updatedEmbed] });
      } catch { }
      return;
    }
    
    const original = reaction.message;
    const embed = new EmbedBuilder()
      .setColor(0xf0b429)
      .setAuthor({ name: original.author.username, iconURL: original.author.displayAvatarURL() })
      .setDescription(original.content || '*[no text]*')
      .addFields({ name: 'Source', value: `[Jump to message](${original.url})`, inline: false })
      .setFooter({ text: `⭐ ${starCount} | #${original.channel.name}` })
      .setTimestamp(original.createdAt);
    const image = original.attachments.find(a => a.contentType?.startsWith('image/'));
    if (image) embed.setImage(image.url);
    try {
      const sbChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID);
      const sbMsg = await sbChannel.send({ embeds: [embed] });
      await setStarboardMessage(reaction.message.id, sbMsg.id, reaction.message.channel.id);
    } catch (err) { console.error('Starboard post error:', err); }
    return;
  }

  // ── POLL VOTING ──
  if (reaction.message.guild) {
    const msgId = reaction.message.id;
    if (pollVotes.has(msgId)) {
      const voteMap = pollVotes.get(msgId);
      const pollEmojis = ['🇦', '🇧', '🇨', '🇩'];
      if (pollEmojis.includes(reaction.emoji.name)) {
        if (voteMap.has(user.id)) {
          try { await reaction.users.remove(user.id); } catch { }
          try {
            const dmUser = await user.createDM();
            await dmUser.send(`⚠️ **GoldenHeart SMP — Poll Warning**\n\nYou tried to vote more than once on a poll. **Only one vote per person is allowed.**\n\nYour extra vote has been removed.`);
          } catch { }
        } else {
          voteMap.set(user.id, reaction.emoji.name);
          pollVotes.set(msgId, voteMap);
        }
        return;
      }
    }
  }

  // ── FEEDBACK REACTIONS ──
  if (!reaction.message.guild) {
    const session = pendingFeedback.get(user.id);
    if (!session) return;
    if (reaction.message.id !== session.messageId) return;
    const emojiIndex = STAR_EMOJIS.indexOf(reaction.emoji.name);
    if (emojiIndex === -1) return;

    if (session.stage === 'pick_staff') {
      const staffList = session.staffList;
      if (emojiIndex >= staffList.length) return;
      const [staffKey, staffInfo] = staffList[emojiIndex];
      const ratingEmbed = new EmbedBuilder()
        .setTitle(`⭐ Rate ${staffInfo.label}`).setColor(0xf0b429)
        .setDescription(`You selected **${staffInfo.label}** (${staffInfo.type}).\n\nReact with a number to give your rating:\n\n1️⃣ ⭐ — Poor\n2️⃣ ⭐⭐ — Fair\n3️⃣ ⭐⭐⭐ — Good\n4️⃣ ⭐⭐⭐⭐ — Great\n5️⃣ ⭐⭐⭐⭐⭐ — Excellent`)
        .setFooter({ text: 'React with 1️⃣ through 5️⃣ to rate.' }).setTimestamp();
      try {
        const dm = reaction.message.channel;
        const rateMsg = await dm.send({ embeds: [ratingEmbed] });
        for (const emoji of STAR_EMOJIS) await rateMsg.react(emoji);
        pendingFeedback.set(user.id, { stage: 'pick_rating', staffKey, messageId: rateMsg.id });
      } catch (err) { console.error('Could not send rating message:', err); }
      return;
    }

    if (session.stage === 'pick_rating') {
      const rating = emojiIndex + 1;
      const staffKey = session.staffKey;
      pendingFeedback.set(user.id, { stage: 'await_comment', staffKey, rating, awaitingComment: true, messageId: session.messageId });
      try {
        const dm = reaction.message.channel;
        await dm.send(`${starsDisplay(rating)} Got it — **${rating}/5** for **${STAFF_MEMBERS[staffKey].label}**!\n\n💬 **Optional:** Type a comment about them, or type \`skip\` to submit now.`);
      } catch (err) { console.error('Could not send comment prompt:', err); }
    }
  }
});

// ─────────────────────────────────────────
// MESSAGE CREATE HANDLER
// ─────────────────────────────────────────
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.guild) {
    const msg = message.content.toLowerCase();
    const content = message.content;

    // AFK check
    if (message.mentions.users.size > 0) {
      const allAFK = await getAllAFK();
      for (const afk of allAFK) {
        if (message.mentions.users.has(afk.userId)) {
          const sinceMs = Date.now() - afk.since.getTime();
          const since = humanDuration(sinceMs);
          await message.reply(`💤 **${afk.username}** is AFK: *${afk.reason}* (since ${since} ago)`).catch(() => { });
        }
      }
    }

    // Remove AFK if user is back
    const afkUser = await getAFK(message.author.id);
    if (afkUser) {
      await removeAFK(message.author.id);
      const notif = await message.reply(`👋 Welcome back, ${message.author.username}! Your AFK has been removed.`).catch(() => null);
      if (notif) autoDelete(notif, 5000);
    }

    // XP gain
    const xpNow = Date.now();
    const lastXP = xpCooldown.get(message.author.id) || 0;
    if (xpNow - lastXP >= XP_COOLDOWN_MS) {
      xpCooldown.set(message.author.id, xpNow);
      const user = await getUser(message.author.id);
      user.username = message.author.tag;
      const oldLevel = getLevelFromXP(user.xp);
      user.xp += XP_PER_MESSAGE;
      const newLevel = getLevelFromXP(user.xp);
      if (newLevel > oldLevel) {
        user.level = newLevel;
        await user.save();
        try {
          const lvlChannel = await client.channels.fetch(LEVEL_UP_CHANNEL_ID);
          const sent = await lvlChannel.send(`🎉 <@${message.author.id}> leveled up to **Level ${newLevel}**! Keep it up! 🚀`);
          autoDelete(sent, 5000);
        } catch { }
      } else {
        await user.save();
      }
    }

    // COINS GAIN (5 messages = 1 coin)
    const coinsNow = Date.now();
    const lastCoins = coinsCooldown.get(message.author.id) || 0;
    if (coinsNow - lastCoins >= COINS_COOLDOWN_MS) {
      coinsCooldown.set(message.author.id, coinsNow);
      const user = await getUser(message.author.id);
      user.username = message.author.tag;
      user.messages += 1;
      
      const earnedCoins = Math.floor(user.messages / 5) - Math.floor((user.messages - 1) / 5);
      if (earnedCoins > 0) {
        user.coins += earnedCoins;
        await user.save();
        console.log(`💰 ${message.author.tag} earned ${earnedCoins} coin(s)! Total: ${user.coins}`);
        try {
          const sentMsg = await message.channel.send(`🪙 **${message.author.username}** earned **${earnedCoins}** Golden Coin(s)! Total: ${user.coins} 🪙`);
          autoDelete(sentMsg, 5000);
        } catch (err) {
          console.error('Could not send coin notification:', err);
        }
      } else {
        await user.save();
      }
    }

    // Cultural / country jokes
    const culturalPatterns = [
      /\b(country|nation|race|ethnic|culture|religion|caste)\s*(joke|meme|humor|banter)/i,
      /\b(indian|pakistani|chinese|american|african|arab|mexican|white|black|asian|jewish|muslim|hindu|christian)\s*(joke|meme|people are|folks are)/i,
      /\byou (indians?|pakistanis?|chinese|africans?|arabs?|mexicans?|whites?|blacks?|asians?)\b/i,
      /\ball (indians?|pakistanis?|chinese|africans?|arabs?|mexicans?|whites?|blacks?|asians?)\b/i,
      /\b(stereotype|stereotyping)\b.*\b(race|country|culture|nation|religion|ethnic)/i,
    ];
    if (culturalPatterns.some(p => p.test(content))) {
      try {
        await message.delete();
        await message.member.timeout(24 * 60 * 60 * 1000, 'Severe violation: Cultural/country/race joke or remark');
        const warnEmbed = new EmbedBuilder()
          .setTitle('🚨 Severe Violation — Immediate Timeout').setColor(0xff0000)
          .setDescription(`<@${message.author.id}>, your message was removed and you have been **timed out for 24 hours**.\n\n> **Reason:** Jokes, stereotypes, or remarks targeting a country, culture, race, or religion are **strictly prohibited**.\n\nFurther violations will result in an immediate ban.`)
          .setFooter({ text: 'GoldenHeart SMP — Zero Tolerance Policy' }).setTimestamp();
        const sent = await message.channel.send({ embeds: [warnEmbed] });
        autoDelete(sent, 10000);
        const logEmbed = new EmbedBuilder()
          .setTitle('🚨 Auto-Mod: Cultural Joke — 1-Day Timeout').setColor(0xff0000)
          .addFields(
            { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
            { name: 'Message', value: content.slice(0, 1024), inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) { console.error('Cultural joke auto-mod error:', err); }
      return;
    }

    // Personal swearing
    const personalSwearPatterns = [
      /\b(fuck|shit|bitch|bastard|asshole|ass hole|dick|cunt|idiot|moron|dumbass|retard)\s*(you|u|ur|your|him|her|them|he|she|they)\b/i,
      /\byou\s*(fucking?|fuckin|shit(ty)?|stupid|dumb|idiot|moron|bitch|asshole|dick|cunt|retard)\b/i,
      /\b(fuck|shit|bitch)\s+off\b/i,
    ];
    if (personalSwearPatterns.some(p => p.test(content))) {
      try {
        await message.delete();
        await addWarn(message.author.id, message.author.tag, 'Using swear words directed at another person', 'AutoMod');
        const warnCount = await getWarnCount(message.author.id);
        const timeoutMins = getTimeoutDuration(warnCount);
        if (timeoutMins) {
          try { await message.member.timeout(timeoutMins * 60 * 1000, `AutoMod Warn #${warnCount}: Swearing at a person`); } catch { }
        }
        const warnEmbed = new EmbedBuilder()
          .setTitle('⚠️ Warning Issued — Personal Swearing').setColor(0xffa500)
          .setDescription(`<@${message.author.id}>, your message was removed and you received **Warn #${warnCount}/8**.\n\n> **Reason:** Using swear words directly at another person is **prohibited**.\n\n${timeoutMins ? `⏱️ You have been timed out for **${timeoutMins} minutes**.` : '⚠️ Next warns will result in timeouts.'}`)
          .setFooter({ text: 'GoldenHeart SMP — Community Rules' }).setTimestamp();
        const sent = await message.channel.send({ embeds: [warnEmbed] });
        autoDelete(sent, 10000);
        const logEmbed = new EmbedBuilder()
          .setTitle('⚠️ Auto-Mod: Personal Swear — Warn Issued').setColor(0xffa500)
          .addFields(
            { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
            { name: 'Warns', value: `${warnCount}/8`, inline: true },
            { name: 'Message', value: content.slice(0, 1024), inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) { console.error('Personal swear auto-mod error:', err); }
      return;
    }

    // Spam / flooding
    if (!hasModPermission(message.member)) {
      const onCooldown = spamCooldown.get(message.author.id);
      if (!onCooldown || Date.now() - onCooldown > 15000) {
        const violation = checkSpam(message);
        if (violation) {
          spamCooldown.set(message.author.id, Date.now());
          try {
            const matched = violation.matchedMessages || [message];
            const toDelete = matched.slice(0, -1);
            for (const m of toDelete) await m.delete().catch(() => { });
            messageHistory.set(message.author.id, []);
            const labelMap = { link_spam: 'Link Spam', rapid_flood: 'Message Flooding', duplicate_spam: 'Duplicate Message Spam' };
            const warnEmbed = new EmbedBuilder()
              .setTitle('⚠️ Spam Detected — Warning').setColor(0xffa500)
              .setDescription(`<@${message.author.id}>, please slow down!\n\n> **Reason:** ${labelMap[violation.type] || 'Spam'}\n> ${violation.detail}\n\nYour extra messages have been removed.`)
              .setFooter({ text: 'GoldenHeart SMP — AutoMod' }).setTimestamp();
            const sent = await message.channel.send({ embeds: [warnEmbed] });
            autoDelete(sent, 10000);
            const logEmbed = new EmbedBuilder()
              .setTitle('⚠️ Auto-Mod: Spam — Warning Issued').setColor(0xffa500)
              .addFields(
                { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                { name: 'Type', value: labelMap[violation.type] || violation.type, inline: true },
                { name: 'Detail', value: violation.detail, inline: false },
              ).setTimestamp();
            await sendLog(client, logEmbed);
          } catch (err) { console.error('Spam auto-mod error:', err); }
          return;
        }
      }
    }

    if (msg === 'ip') return message.reply(`💛 **GoldenHeart SMP** is now online!\n🌍 **IP:** \`goldenheartsmp.minecraftnoob.com:25565\`\n⚔️ Join now and start your journey!`);
    if (msg === 'rules') return message.reply(`📜 Use \`/rules\` to see the full server rules!\n\n📌 Or check: <#1432277447440597028>`);
    if (msg === 'features') return message.reply(`📋 Use \`/features\` to see everything you can do as a member!`);
    return;
  }

  // ── DM: Feedback comment ──
  const userId = message.author.id;
  const fbSession = pendingFeedback.get(userId);
  if (fbSession?.awaitingComment) {
    pendingFeedback.delete(userId);
    const comment = message.content.trim().toLowerCase() === 'skip' ? null : message.content.trim();
    const staffKey = fbSession.staffKey;
    const staffInfo = STAFF_MEMBERS[staffKey];
    const rating = fbSession.rating;
    
    await addFeedback(
      staffKey,
      staffInfo.label,
      staffInfo.type,
      message.author.id,
      message.author.tag,
      rating,
      comment || ''
    );
    
    try {
      const staffUser = await client.users.fetch(staffInfo.id);
      const dmEmbed = new EmbedBuilder()
        .setTitle('📬 You received new feedback!').setColor(0xf0b429)
        .addFields(
          { name: 'Rating', value: `${starsDisplay(rating)} (${rating}/5)`, inline: true },
          { name: 'From', value: `Anonymous`, inline: true },
          { name: 'Comment', value: comment || '*No comment provided.*', inline: false },
        ).setTimestamp();
      await staffUser.send({ embeds: [dmEmbed] });
    } catch { console.log(`Could not DM staff member ${staffInfo.label}`); }
    return message.channel.send(`✅ **Feedback submitted!**\n\n${starsDisplay(rating)} **(${rating}/5)** for **${staffInfo.label}** (${staffInfo.type})${comment ? `\n💬 *"${comment}"*` : ''}\n\nThank you for your feedback!`);
  }

  // ── DM: Application flow ──
  const session = activeSessions.get(userId);
  if (!session) return;
  const questions = QUESTIONS[session.role];
  const currentQ = questions[session.step];
  if (currentQ.key === 'why' && message.content.trim().length < 50) {
    return message.channel.send('⚠️ Please write at least 50 characters for this answer. Try again:');
  }
  session.answers[currentQ.key] = message.content.trim();
  session.step++;
  if (session.step < questions.length) {
    return message.channel.send(questions[session.step].q);
  }
  activeSessions.delete(userId);
  const appId = 'APP-' + Date.now().toString(36).toUpperCase();
  const entry = { id: appId, userId, userTag: message.author.tag, role: session.role, answers: session.answers };
  await saveApplication(session.role, entry);
  await message.channel.send(`✅ **Application submitted!**\n\nYour **${APP_NAMES[session.role]}** application has been received.\n📋 Application ID: \`${appId}\`\n\nYou'll receive a DM when the staff team has reviewed it. Thanks for applying!`);
  const embed = new EmbedBuilder()
    .setTitle(`📋 New Application — ${APP_NAMES[session.role]}`)
    .setColor(session.role === 'chatmod' ? 0xf0b429 : session.role === 'helper' ? 0x5b8dee : 0x3dd68c)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Applicant', value: `<@${userId}> (${message.author.tag})`, inline: true },
      { name: '🆔 App ID', value: `\`${appId}\``, inline: true },
      { name: '📅 Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      ...Object.entries(session.answers).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v.length > 1024 ? v.slice(0, 1021) + '...' : v,
        inline: false,
      }))
    )
    .setFooter({ text: `Role applied for: ${APP_NAMES[session.role]}` }).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_accept:${session.role}:${userId}:${appId}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app_reject:${session.role}:${userId}:${appId}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger),
  );
  try {
    const logChannel = await client.channels.fetch(STAFF_LOG_CHANNEL);
    await logChannel.send({ embeds: [embed], components: [row] });
  } catch (err) { console.error('Could not send to staff log:', err); }
});

// ─────────────────────────────────────────
// INTERACTION CREATE HANDLER
// ─────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  // Inside your client.on('interactionCreate', async interaction => { ... })

if (interaction.isChatInputCommand()) {
  const commandName = interaction.commandName;
  
    
    // ── AI COMMANDS ──
    const aiCommands = ['ai', 'ai_setchannel', 'ai_memory', 'ai_forget', 'ai_forceforget', 'ai_stats'];
    if (aiCommands.includes(commandName)) {
      return handleAIInteraction(interaction, client, getUser, getLevelFromXP);
    }
  
  // ... rest of your existing command handlers ...
}
  // ── MODALS ──
  if (interaction.isModalSubmit()) {
    // Edit price modal
    if (interaction.customId.startsWith('edit_price_modal:')) {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can edit shop prices.', ephemeral: true });
      }
      
      const parts = interaction.customId.split(':');
      const categoryKey = parts[1];
      const itemId = parts[2];
      const newPrice = parseInt(interaction.fields.getTextInputValue('new_price'), 10);
      
      if (isNaN(newPrice) || newPrice < 0) {
        return interaction.reply({ content: '❌ Invalid price. Please enter a valid number.', ephemeral: true });
      }
      
      const category = SHOP_CATEGORIES[categoryKey];
      if (!category) return interaction.reply({ content: '❌ Category not found.', ephemeral: true });
      
      const item = category.items.find(i => i.id === itemId);
      if (!item) return interaction.reply({ content: '❌ Item not found.', ephemeral: true });
      
      const oldPrice = item.price;
      item.price = newPrice;
      
      const embed = new EmbedBuilder()
        .setTitle('💰 Shop Price Updated')
        .setColor(0x57f287)
        .setDescription(`**${item.name}** price has been updated!`)
        .addFields(
          { name: '📂 Category', value: `${category.emoji} ${category.name}`, inline: true },
          { name: '🛒 Item', value: item.name, inline: true },
          { name: '💰 Old Price', value: `${oldPrice} coins`, inline: true },
          { name: '💰 New Price', value: `${newPrice} coins`, inline: true },
          { name: '👤 Updated By', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await sendLog(client, embed);
      return;
    }

    // Apply coupon modal
    if (interaction.customId === 'apply_coupon_modal') {
      const couponCode = interaction.fields.getTextInputValue('coupon_code').toUpperCase().trim();
      const userId = interaction.user.id;
      
      const result = await applyCouponToCart(userId, couponCode);
      
      if (!result.success) {
        return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
      }
      
      const cartData = await getCartWithDiscount(userId);
      
      const embed = new EmbedBuilder()
        .setTitle('🎫 Coupon Applied!')
        .setColor(0x57f287)
        .setDescription(`Coupon **${couponCode}** has been applied to your cart!`)
        .addFields(
          { name: '💰 Discount', value: `${cartData.discount} coins`, inline: true },
          { name: '💳 New Total', value: `${cartData.finalTotal} coins`, inline: true },
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Create coupon modal
    if (interaction.customId === 'create_coupon_modal') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can create coupons.', ephemeral: true });
      }
      
      const amount = parseInt(interaction.fields.getTextInputValue('coupon_amount'), 10);
      const type = interaction.fields.getTextInputValue('coupon_type');
      const maxUses = parseInt(interaction.fields.getTextInputValue('coupon_max_uses'), 10) || null;
      const expiresIn = interaction.fields.getTextInputValue('coupon_expires');
      
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({ content: '❌ Invalid amount. Please enter a valid number greater than 0.', ephemeral: true });
      }
      
      if (!['fixed', 'percent'].includes(type)) {
        return interaction.reply({ content: '❌ Invalid type. Must be "fixed" or "percent".', ephemeral: true });
      }
      
      let expiresAt = null;
      if (expiresIn) {
        const ms = parseDuration(expiresIn);
        if (ms) {
          expiresAt = new Date(Date.now() + ms).toISOString();
        }
      }
      
      const code = await createCoupon(amount, type, maxUses, expiresAt);
      
      const embed = new EmbedBuilder()
        .setTitle('🎫 Coupon Created!')
        .setColor(0x57f287)
        .setDescription(`A new coupon has been created!`)
        .addFields(
          { name: '🎟️ Coupon Code', value: `\`${code}\``, inline: true },
          { name: '💰 Amount', value: type === 'fixed' ? `${amount} coins off` : `${amount}% off`, inline: true },
          { name: '📊 Type', value: type === 'fixed' ? 'Fixed Discount' : 'Percentage Discount', inline: true },
          { name: '📝 Max Uses', value: maxUses ? `${maxUses}` : 'Unlimited', inline: true },
          { name: '⏰ Expires', value: expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>` : 'Never', inline: true },
          { name: '👤 Created By', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await sendLog(client, embed);
      return;
    }

    // Edit message modal
    if (interaction.customId.startsWith('editmsg_modal:')) {
      if (!isGuildOwner(interaction)) {
        return interaction.reply({ content: '❌ Only the server owner can edit messages.', ephemeral: true });
      }
      
      const [, channelId, messageId] = interaction.customId.split(':');
      const newContent = interaction.fields.getTextInputValue('new_content');
      try {
        const ch = await client.channels.fetch(channelId);
        const msg = await ch.messages.fetch(messageId);
        if (msg.author.id !== client.user.id)
          return interaction.reply({ content: '❌ I can only edit my own messages.', ephemeral: true });
        await msg.edit(newContent);
        await interaction.reply({ content: '✅ Message edited successfully!', ephemeral: true });
        const logEmbed = new EmbedBuilder()
          .setTitle('✏️ Owner Edited Bot Message').setColor(0x5865f2)
          .addFields(
            { name: 'Editor', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Channel', value: `<#${channelId}>`, inline: true },
            { name: 'Message ID', value: messageId, inline: true },
            { name: 'New Content', value: newContent.slice(0, 1024), inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        console.error('Edit message error:', err);
        return interaction.reply({ content: `❌ Failed to edit message: ${err.message}`, ephemeral: true });
      }
    }

    // Edit embed modal
    if (interaction.customId.startsWith('editembed_modal:')) {
      if (!isGuildOwner(interaction)) {
        return interaction.reply({ content: '❌ Only the server owner can edit embeds.', ephemeral: true });
      }
      
      const [, channelId, messageId] = interaction.customId.split(':');
      const newTitle = interaction.fields.getTextInputValue('embed_title');
      const newDescription = interaction.fields.getTextInputValue('embed_description');
      const newColorRaw = interaction.fields.getTextInputValue('embed_color');
      const newFooter = interaction.fields.getTextInputValue('embed_footer');
      try {
        const ch = await client.channels.fetch(channelId);
        const msg = await ch.messages.fetch(messageId);
        if (msg.author.id !== client.user.id)
          return interaction.reply({ content: '❌ I can only edit my own messages.', ephemeral: true });
        if (!msg.embeds.length)
          return interaction.reply({ content: '❌ That message has no embed to edit.', ephemeral: true });
        const colorInt = newColorRaw ? parseInt(newColorRaw.replace('#', ''), 16) : undefined;
        const updatedEmbed = EmbedBuilder.from(msg.embeds[0]);
        if (newTitle.trim()) updatedEmbed.setTitle(newTitle.trim());
        if (newDescription.trim()) updatedEmbed.setDescription(newDescription.trim());
        if (newColorRaw && !isNaN(colorInt)) updatedEmbed.setColor(colorInt);
        if (newFooter.trim()) updatedEmbed.setFooter({ text: newFooter.trim() });
        await msg.edit({ embeds: [updatedEmbed] });
        await interaction.reply({ content: '✅ Embed edited successfully!', ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: `❌ Failed to edit embed: ${err.message}`, ephemeral: true });
      }
    }

    // Edit rules modal
    if (interaction.customId.startsWith('editrules_modal:')) {
      if (!isGuildOwner(interaction)) {
        return interaction.reply({ content: '❌ Only the server owner can edit rules.', ephemeral: true });
      }
      
      const [, bookKey, pageIndexStr] = interaction.customId.split(':');
      const pageIndex = parseInt(pageIndexStr, 10);
      const newTitle = interaction.fields.getTextInputValue('page_title');
      const newContent = interaction.fields.getTextInputValue('page_content');
      const book = RULEBOOKS[bookKey];
      if (!book || !book.pages[pageIndex])
        return interaction.reply({ content: '❌ Invalid rulebook or page.', ephemeral: true });
      book.pages[pageIndex].title = newTitle.trim();
      book.pages[pageIndex].content = newContent.trim();
      await saveRulebooks(RULEBOOKS);
      const embed = buildBookEmbed(book.title, book.pages, pageIndex, book.color);
      const row = buildBookRow(pageIndex, book.pages.length, bookKey);
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Page ${pageIndex + 1} of **${book.title}** updated and reposted!`, ephemeral: true });
    }
  }

  // ── SLASH COMMANDS ──
  if (interaction.isChatInputCommand()) {
    const commandName = interaction.commandName;

    // ── SHOP COMMANDS ──
    if (commandName === 'shop') {
      const embed = buildShopEmbed();
      const selectRow = buildCategorySelectMenu();
      const cartRow = buildCartButtons();
      await interaction.reply({ embeds: [embed], components: [selectRow, cartRow], ephemeral: true });
      return;
    }

    if (commandName === 'cart') {
      const userId = interaction.user.id;
      const cartData = await getCartWithDiscount(userId);
      
      if (cartData.items.length === 0) {
        return interaction.reply({ content: '🛒 Your cart is empty! Browse the shop with `/shop` to add items.', ephemeral: true });
      }
      
      const itemsList = cartData.items.map((item, i) =>
        `**${i + 1}.** ${item.name} x${item.quantity} — ${item.subtotal} coins`
      ).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 Your Shopping Cart')
        .setColor(0xf0b429)
        .setDescription([
          itemsList,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `💰 **Subtotal:** ${cartData.total} coins`,
          cartData.coupon ? `🎫 **Discount:** -${cartData.discount} coins` : '',
          `💳 **Total:** ${cartData.finalTotal} coins`,
          '',
          cartData.coupon ? `✅ **Coupon Applied:** \`${cartData.coupon.code}\`` : '',
          '',
          'Use the buttons below to checkout or apply a coupon!',
        ].filter(Boolean).join('\n'))
        .setFooter({ text: `${cartData.items.length} items in cart` })
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cart_checkout').setLabel('💳 Checkout').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cart_coupon').setLabel('🎫 Apply Coupon').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cart_clear').setLabel('🗑️ Clear Cart').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('shop_back').setLabel('◀ Back to Shop').setStyle(ButtonStyle.Secondary)
      );
      
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    if (commandName === 'shop_balance') {
      const target = interaction.options.getUser('user') || interaction.user;
      const user = await getUser(target.id);
      const purchases = await getUserPurchases(target.id);
      const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);
      
      const embed = new EmbedBuilder()
        .setTitle(`💰 ${target.username}'s Shop Info`)
        .setColor(0xf0b429)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '🪙 Balance', value: `${user.coins} coins`, inline: true },
          { name: '💳 Total Spent', value: `${totalSpent} coins`, inline: true },
          { name: '📦 Total Purchases', value: `${purchases.length}`, inline: true },
          { name: '📊 Recent Purchases', value: purchases.length > 0 ?
            purchases.slice(0, 5).map((p, i) => {
              const status = p.completed ? '✅' : '⏳';
              const discountInfo = p.couponCode ? ` (coupon: ${p.couponCode})` : '';
              return `**${i + 1}.** ${p.itemId} (${p.amount}x) — ${p.price} coins ${status}${discountInfo}`;
            }).join('\n') : 'No purchases yet!',
            inline: false
          },
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (commandName === 'shop_purchases') {
      const target = interaction.options.getUser('user') || interaction.user;
      const purchases = await getUserPurchases(target.id);
      
      if (purchases.length === 0) {
        return interaction.reply({ content: `📋 **${target.username}** hasn't made any purchases yet!`, ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${target.username}'s Purchase History`)
        .setColor(0xf0b429)
        .setThumbnail(target.displayAvatarURL())
        .setDescription(
          purchases.map((p, i) => {
            const status = p.completed ? '✅ Completed' : '⏳ Pending';
            const discountInfo = p.couponCode ? ` (Coupon: ${p.couponCode}${p.originalPrice ? `, Original: ${p.originalPrice}` : ''})` : '';
            return `**${i + 1}.** ${p.itemId} (${p.amount}x) — ${p.price} coins ${status}${discountInfo}\n> ${p.purchasedAt.toLocaleDateString()}`;
          }).join('\n\n')
        )
        .setFooter({ text: `Total: ${purchases.length} purchases • Total spent: ${purchases.reduce((s, p) => s + p.price, 0)} coins` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (commandName === 'shoppanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      const embed = buildShopEmbed();
      const selectRow = buildCategorySelectMenu();
      const cartRow = buildCartButtons();
      await interaction.channel.send({ embeds: [embed], components: [selectRow, cartRow] });
      return interaction.reply({ content: '✅ Shop panel posted!', ephemeral: true });
    }

    if (commandName === 'shop_editprice') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can edit shop prices.', ephemeral: true });
      }
      
      const categoryKey = interaction.options.getString('category');
      const itemId = interaction.options.getString('item');
      const category = SHOP_CATEGORIES[categoryKey];
      
      if (!category) return interaction.reply({ content: '❌ Category not found.', ephemeral: true });
      const item = category.items.find(i => i.id === itemId);
      if (!item) return interaction.reply({ content: '❌ Item not found in this category.', ephemeral: true });
      
      const modal = new ModalBuilder()
        .setCustomId(`edit_price_modal:${categoryKey}:${itemId}`)
        .setTitle(`Edit Price: ${item.name}`);
      const priceInput = new TextInputBuilder()
        .setCustomId('new_price')
        .setLabel(`Current Price: ${item.price} coins - New Price:`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Enter new price in coins');
      modal.addComponents(new ActionRowBuilder().addComponents(priceInput));
      await interaction.showModal(modal);
      return;
    }

    if (commandName === 'shop_listitems') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can view this.', ephemeral: true });
      }
      
      let description = '';
      for (const [key, category] of Object.entries(SHOP_CATEGORIES)) {
        description += `\n**${category.emoji} ${category.name}**\n`;
        category.items.forEach(item => {
          description += `\`${item.id}\` — ${item.name} — **${item.price}** coins\n`;
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📋 Shop Items List')
        .setColor(0xf0b429)
        .setDescription(description || 'No items found.')
        .setFooter({ text: 'Use /shop_editprice to change prices' })
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── COUPON COMMANDS ──
    if (commandName === 'create_coupon') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can create coupons.', ephemeral: true });
      }
      
      const modal = new ModalBuilder()
        .setCustomId('create_coupon_modal')
        .setTitle('🎫 Create Coupon');
      
      const amountInput = new TextInputBuilder()
        .setCustomId('coupon_amount')
        .setLabel('Discount Amount (coins or %)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('e.g., 50 or 20');
      
      const typeInput = new TextInputBuilder()
        .setCustomId('coupon_type')
        .setLabel('Type: "fixed" or "percent"')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('fixed');
      
      const maxUsesInput = new TextInputBuilder()
        .setCustomId('coupon_max_uses')
        .setLabel('Max Uses (optional, leave blank for unlimited)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('e.g., 10');
      
      const expiresInput = new TextInputBuilder()
        .setCustomId('coupon_expires')
        .setLabel('Expires (optional, e.g., 7d, 30d)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('e.g., 7d');
      
      modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(typeInput),
        new ActionRowBuilder().addComponents(maxUsesInput),
        new ActionRowBuilder().addComponents(expiresInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (commandName === 'list_coupons') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can view coupons.', ephemeral: true });
      }
      
      const coupons = await Coupon.find({}).lean();
      
      if (coupons.length === 0) {
        return interaction.reply({ content: '📋 No coupons have been created yet.', ephemeral: true });
      }
      
      const activeCoupons = coupons.filter(c => c.active);
      const inactiveCoupons = coupons.filter(c => !c.active);
      
      let description = '**Active Coupons:**\n';
      activeCoupons.forEach(c => {
        const uses = c.maxUses ? `${c.usedCount}/${c.maxUses}` : `${c.usedCount} used`;
        description += `\`${c.code}\` — ${c.type === 'fixed' ? `${c.amount} coins off` : `${c.amount}% off`} — Uses: ${uses}`;
        if (c.expiresAt) {
          description += ` — Expires: <t:${Math.floor(c.expiresAt.getTime() / 1000)}:R>`;
        }
        description += '\n';
      });
      
      if (inactiveCoupons.length > 0) {
        description += '\n**Inactive Coupons:**\n';
        inactiveCoupons.slice(0, 5).forEach(c => {
          description += `\`${c.code}\` — ${c.type === 'fixed' ? `${c.amount} coins off` : `${c.amount}% off`} — Used: ${c.usedCount}\n`;
        });
        if (inactiveCoupons.length > 5) {
          description += `... and ${inactiveCoupons.length - 5} more inactive coupons.\n`;
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎫 Coupon List')
        .setColor(0xf0b429)
        .setDescription(description)
        .addFields(
          { name: '📊 Total Coupons', value: `${coupons.length}`, inline: true },
          { name: '✅ Active', value: `${activeCoupons.length}`, inline: true },
          { name: '❌ Inactive', value: `${inactiveCoupons.length}`, inline: true },
        )
        .setFooter({ text: 'Use /create_coupon to create new coupons' })
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── BALANCE COMMAND ──
    if (commandName === 'balance') {
      const target = interaction.options.getUser('user') || interaction.user;
      const user = await getUser(target.id);
      const embed = new EmbedBuilder()
        .setTitle(`🪙 ${target.username}'s Golden Coins`)
        .setColor(0xf0b429)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '💰 Balance', value: `${user.coins} Golden Coins`, inline: true },
          { name: '💬 Messages', value: `${user.messages || 0}`, inline: true },
          { name: '🎤 Voice Minutes', value: `${user.voiceMinutes || 0} min`, inline: true },
          { name: '📨 Invites', value: `${user.invites || 0}`, inline: true },
        )
        .setFooter({ text: `5 messages = 1 coin • 1 min voice = 1 coin • 1 invite = 50 coins` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── COINS LEADERBOARD ──
    if (commandName === 'coinslb') {
      const leaderboard = await getCoinsLeaderboard(10);
      if (leaderboard.length === 0) {
        return interaction.reply({ content: '🪙 No coins have been earned yet! Be the first to earn some! 💰', ephemeral: true });
      }
      
      const medals = ['🥇', '🥈', '🥉'];
      const lines = leaderboard.map((user, index) => {
        const medal = medals[index] || `\`${index + 1}.\``;
        return `${medal} <@${user.userId}> — **${user.coins}** coins (${user.messages || 0} msgs, ${user.voiceMinutes || 0} min VC)`;
      }).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('🪙 Golden Coins Leaderboard — Top 10')
        .setColor(0xf0b429)
        .setDescription(lines)
        .addFields(
          { name: '📊 How to Earn', value: '💬 5 messages = 1 coin\n🎤 1 min voice = 1 coin\n📨 1 invite = 50 coins' }
        )
        .setFooter({ text: 'Keep chatting, VCing, and inviting to earn more coins!' })
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── DAILY COMMAND ──
    if (commandName === 'daily') {
      const userId = interaction.user.id;
      const user = await getUser(userId);
      user.username = interaction.user.tag;
      
      const today = new Date().toDateString();
      if (user.lastDaily && user.lastDaily.toDateString() === today) {
        return interaction.reply({ content: `⏰ You already claimed your daily reward today! Come back tomorrow for another **50 Golden Coins**! 💰`, ephemeral: true });
      }
      
      user.coins += 50;
      user.lastDaily = new Date();
      await user.save();
      
      const embed = new EmbedBuilder()
        .setTitle('🎉 Daily Reward Claimed!')
        .setColor(0x57f287)
        .setDescription(`💰 You received **50 Golden Coins**!`)
        .addFields(
          { name: '💳 New Balance', value: `${user.coins} coins`, inline: true },
          { name: '⏰ Next Claim', value: 'Tomorrow!', inline: true },
        )
        .setFooter({ text: 'Keep earning coins by chatting, VCing, and inviting!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
// ── AI COMMAND ──
if (interaction.isChatInputCommand()) {
  const aiCommands = ['ai', 'ai_setchannel', 'ai_memory', 'ai_forget', 'ai_forceforget', 'ai_stats'];
  if (aiCommands.includes(interaction.commandName)) {
    return handleAIInteraction(interaction, client, getUser, getLevelFromXP);
  }
}


client.on('messageCreate', async (message) => {
    // Pass the message and helper functions to the AI handler
    await handleAIMessage(message, client, getUser, getLevelFromXP); 
});
    // ── TRANSFER COMMAND ──
    if (commandName === 'transfer') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      
      if (amount <= 0) return interaction.reply({ content: '❌ Amount must be greater than 0!', ephemeral: true });
      if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot transfer coins to yourself!', ephemeral: true });
      
      const sender = await getUser(interaction.user.id);
      if (sender.coins < amount) {
        return interaction.reply({ content: `❌ You don't have enough coins! You have **${sender.coins}** coins but tried to transfer **${amount}**.`, ephemeral: true });
      }
      
      const receiver = await getUser(target.id);
      sender.coins -= amount;
      receiver.coins += amount;
      sender.username = interaction.user.tag;
      receiver.username = target.tag;
      await sender.save();
      await receiver.save();
      
      const embed = new EmbedBuilder()
        .setTitle('💸 Transfer Complete!')
        .setColor(0x57f287)
        .setDescription(`<@${interaction.user.id}> successfully transferred **${amount}** Golden Coins to <@${target.id}>!`)
        .addFields(
          { name: '📤 Sender\'s New Balance', value: `${sender.coins} coins`, inline: true },
          { name: '📥 Receiver\'s New Balance', value: `${receiver.coins} coins`, inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
      try {
        const receiverUser = await client.users.fetch(target.id);
        await receiverUser.send(`💸 **Coin Transfer Received!**\n\nYou received **${amount}** Golden Coins from **${interaction.user.username}**!\n\n💰 New Balance: ${receiver.coins} coins`);
      } catch (err) { console.log(`Could not DM user ${target.id} about transfer`); }
      return;
    }

    // ── SETBALANCE COMMAND ──
    if (commandName === 'setbalance') {
      if (!hasModPermission(interaction.member)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }
      
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      if (amount < 0) return interaction.reply({ content: '❌ Amount must be 0 or greater!', ephemeral: true });
      
      const user = await getUser(target.id);
      const oldBalance = user.coins;
      user.coins = amount;
      user.username = target.tag;
      await user.save();
      
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Balance Set')
        .setColor(0x5865f2)
        .setDescription(`<@${interaction.user.id}> set the balance for <@${target.id}>!`)
        .addFields(
          { name: '👤 User', value: `${target.tag}`, inline: true },
          { name: '💰 Old Balance', value: `${oldBalance} coins`, inline: true },
          { name: '💰 New Balance', value: `${amount} coins`, inline: true },
          { name: '📋 Reason', value: reason, inline: false },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await sendLog(client, embed);
      
      try {
        const targetUser = await client.users.fetch(target.id);
        await targetUser.send(`⚙️ **Balance Updated by Staff**\n\nYour Golden Coins balance has been set to **${amount}** coins.\n\n📋 Reason: ${reason}\n👤 Staff: ${interaction.user.tag}`);
      } catch (err) { console.log(`Could not DM user ${target.id} about balance update`); }
      return;
    }

    // ── RANK COMMAND ──
    if (commandName === 'rank') {
      const target = interaction.options.getUser('user') || interaction.user;
      const user = await getUser(target.id);
      
      if (user.xp === 0) {
        return interaction.reply({ content: `📊 **${target.username}** hasn't earned any XP yet.`, ephemeral: true });
      }
      
      const level = getLevelFromXP(user.xp);
      const xpThisLevel = user.xp - xpForLevel(level);
      const xpNeeded = xpForLevel(level + 1) - xpForLevel(level);
      const progress = Math.floor((xpThisLevel / xpNeeded) * 20);
      const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
      
      const allUsers = await User.find({}).sort({ xp: -1 }).lean();
      const rank = allUsers.findIndex(u => u.userId === target.id) + 1;
      
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${target.username}'s Rank`).setColor(0xf0b429)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '🏅 Rank', value: `#${rank}`, inline: true },
          { name: '⭐ Level', value: `${level}`, inline: true },
          { name: '✨ Total XP', value: `${user.xp}`, inline: true },
          { name: '🪙 Coins', value: `${user.coins}`, inline: true },
          { name: `Progress to Level ${level + 1}`, value: `\`[${bar}]\` ${xpThisLevel}/${xpNeeded} XP`, inline: false },
        )
        .setFooter({ text: 'Keep chatting to earn more XP and coins!' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ── LEADERBOARD COMMAND ──
    if (commandName === 'leaderboard') {
      const topUsers = await User.find({ xp: { $gt: 0 } })
        .sort({ xp: -1 })
        .limit(10)
        .lean();
      
      if (topUsers.length === 0) {
        return interaction.reply({ content: '📊 No XP data yet — start chatting!', ephemeral: true });
      }
      
      const medals = ['🥇', '🥈', '🥉'];
      const lines = topUsers.map((user, i) => {
        const level = getLevelFromXP(user.xp);
        const medal = medals[i] || `\`${i + 1}.\``;
        return `${medal} <@${user.userId}> — **Level ${level}** (${user.xp} XP)`;
      }).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('🏆 XP Leaderboard — Top 10')
        .setColor(0xf0b429)
        .setDescription(lines)
        .setFooter({ text: 'Earn XP by chatting every minute!' })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── WARN COMMANDS ──
    if (commandName === 'warn') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ You do not have permission to warn members.', ephemeral: true });
      
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      if (target.user.bot) return interaction.reply({ content: '❌ Cannot warn a bot.', ephemeral: true });
      if (target.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Cannot warn an admin.', ephemeral: true });
      
      await addWarn(target.user.id, target.user.tag, reason, interaction.user.tag);
      const warnCount = await getWarnCount(target.user.id);
      const timeoutMins = getTimeoutDuration(warnCount);
      
      let punishmentText = '';
      if (timeoutMins) {
        try {
          await target.timeout(timeoutMins * 60 * 1000, `Warn #${warnCount}: ${reason}`);
          punishmentText = warnCount >= 8 ? `\n⛔ **Permanently muted** (28-day timeout applied)` : `\n⏱️ **Timed out for ${timeoutMins} minutes**`;
        } catch {
          punishmentText = `\n⚠️ Could not apply timeout (check bot role position)`;
        }
      }
      
      try {
        await target.user.send(`⚠️ **You have been warned in GoldenHeart SMP**\n\n📋 **Reason:** ${reason}\n🔢 **Warn #${warnCount}/8**\n👤 **Warned by:** ${interaction.user.tag}\n\n${timeoutMins ? `⏱️ You have been timed out for ${timeoutMins} minutes.` : ''}\n\nPlease review the server rules and be more careful in the future.`);
      } catch (err) { console.log(`Could not DM warned user ${target.user.id}`); }
      
      return interaction.reply({ content: `⚠️ **${target.user.tag}** has been warned.\n📋 **Reason:** ${reason}\n🔢 **Total warns:** ${warnCount}/8${punishmentText}` });
    }

    if (commandName === 'unwarn') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      const target = interaction.options.getUser('user');
      const removed = await removeLastWarn(target.id);
      if (!removed) return interaction.reply({ content: `✅ **${target.tag}** has no warns.`, ephemeral: true });
      
      const remaining = await getWarnCount(target.id);
      try {
        await target.send(`✅ **Warning Removed**\n\nOne of your warnings has been removed by **${interaction.user.tag}**.\n🔢 **Remaining warns:** ${remaining}`);
      } catch (err) { console.log(`Could not DM user ${target.id} about unwarn`); }
      return interaction.reply({ content: `✅ Removed latest warn from **${target.tag}**.\n🔢 **Remaining warns:** ${remaining}` });
    }

    if (commandName === 'warnings') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      const target = interaction.options.getUser('user');
      const warns = await getWarns(target.id);
      if (warns.length === 0)
        return interaction.reply({ content: `✅ **${target.tag}** has no warns.`, ephemeral: true });
      
      const list = warns.map((w, i) => {
        const date = w.timestamp.toLocaleDateString();
        return `**#${i + 1}** — ${w.reason} *(by ${w.warnedBy} on ${date})*`;
      }).join('\n');
      const warnCount = warns.length;
      const nextTimeout = getTimeoutDuration(warnCount + 1);
      return interaction.reply({
        content: `📋 **Warns for ${target.tag}** — ${warnCount}/8\n\n${list}\n\n${nextTimeout ? `⏭️ Next warn → **${nextTimeout}-min timeout**` : warnCount >= 8 ? '🔴 Max warns reached' : ''}`,
        ephemeral: true,
      });
    }

    if (commandName === 'clearwarns') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      const target = interaction.options.getUser('user');
      await clearWarns(target.id);
      try {
        await target.send(`🧹 **All Warnings Cleared**\n\nAll of your warnings have been cleared by **${interaction.user.tag}**.\nYou have a clean slate!`);
      } catch (err) { console.log(`Could not DM user ${target.id} about clearwarns`); }
      return interaction.reply({ content: `🧹 Cleared all warns for **${target.tag}**.` });
    }

    // ── FEATURES COMMAND ──
    if (commandName === 'features') {
      const embed = new EmbedBuilder()
        .setTitle('✨ GoldenHeart SMP — Member Features').setColor(0xf0b429)
        .setDescription('Here\'s everything available to you as a member of GoldenHeart SMP!')
        .addFields(
          { name: '🔐 Verification', value: `Verify in <#${VERIFY_CHANNEL_ID}> to unlock full server access.`, inline: false },
          { name: '📋 Staff Applications', value: 'Use the **Staff Application panel** to apply for Chat Moderator, Helper, or Minecraft Chat Moderator.', inline: false },
          { name: '⭐ Staff Feedback', value: 'Use `/feedback` to rate any staff member out of 5 stars via DM. All feedback is **anonymous**.', inline: false },
          { name: '💡 Suggestions', value: 'Use `/suggest` to submit server ideas. They appear in the suggestions channel with **Accept/Reject** buttons for staff.', inline: false },
          { name: '🌍 Minecraft Server', value: 'Type `ip` in any channel to get the MC server IP.\n> `goldenheartsmp.minecraftnoob.com:25565`', inline: false },
          { name: '📊 Leveling & XP', value: 'Earn XP by chatting! Use `/rank` to see your level and `/leaderboard` for the top 10.', inline: false },
          { name: '🪙 Golden Coins', value: 'Earn **Golden Coins** by chatting (5 messages = 1 coin), joining voice chat (1 coin per minute), and inviting members (50 coins per invite)! Use `/balance`, `/coinslb`, `/daily`, and `/transfer` to manage your coins.', inline: false },
          { name: '🛒 Golden Coins Shop', value: 'Spend your hard-earned Golden Coins on useful resources and gear! Use `/shop` to browse, add items to your cart, and checkout! Use coupons for discounts!', inline: false },
          { name: '🎫 Coupons', value: 'Use coupon codes at checkout to get discounts on your purchases!', inline: false },
          { name: '🎉 Giveaways', value: 'Watch for giveaway announcements — react with 🎉 to enter!', inline: false },
          { name: '💤 AFK System', value: 'Use `/afk <reason>` to mark yourself AFK. The bot will notify others who ping you.', inline: false },
          { name: '⏰ Reminders', value: 'Use `/remindme <time> <text>` to set a personal reminder via DM.', inline: false },
          { name: '🎂 Birthdays', value: 'Use `/birthday set` to register your birthday. The bot will celebrate it server-wide!', inline: false },
          { name: '🌟 Starboard', value: `Get ${STARBOARD_THRESHOLD}+ ⭐ reactions on your message to have it featured in the starboard!`, inline: false },
          { name: '📜 Rules', value: 'Use `/rules` to view the full server rule set at any time.', inline: false },
          { name: '🗳️ Polls', value: 'Staff may create polls in the server — react with the emoji letter to cast your vote!', inline: false },
        )
        .setFooter({ text: 'GoldenHeart SMP — Glad to have you here! 💛' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ── RULES COMMAND ──
    if (commandName === 'rules') {
      const embed = new EmbedBuilder()
        .setTitle('📜 GoldenHeart SMP — Server Rules').setColor(0xed4245)
        .setDescription('Please read all rules carefully. **"I didn\'t know" is not an excuse.**\n\nUse `/rulebook_mc`, `/rulebook_chat`, or `/rulebook_general` to browse the full paginated rulebook!')
        .addFields(
          { name: '🌍 Rule 1 — Cultural & Country Respect  🚨 SEVERE', value: 'Jokes, memes, stereotypes targeting any country, culture, race, or religion are **strictly prohibited**.\n**Punishment:** Message deleted + **immediate 24-hour timeout**.\n**Repeat:** Permanent ban.', inline: false },
          { name: '🤬 Rule 2 — Swearing Policy', value: 'Swearing about situations ✅ allowed. Swearing **at** a person ❌ NOT allowed.\n**1 warn + timeout for directing swears at someone.**', inline: false },
          { name: '🔇 Rule 3 — No Harassment', value: 'No threats, doxxing, or hate speech of any kind.', inline: false },
          { name: '🔞 Rule 4 — Keep It Appropriate', value: 'No NSFW content, graphic violence, or disturbing material.', inline: false },
          { name: '🔗 Rule 5 — No Spam', value: 'No spam, repeated messages, or unsolicited promotion.', inline: false },
          { name: '🛡️ Rule 6 — Respect Staff', value: 'Follow staff instructions. Disrespecting staff may result in additional warnings.', inline: false },
          { name: '⚠️ Warning System', value: '```\nWarn 1  →  ⚠️  Warning only\nWarn 2  →  ⚠️  Warning only\nWarn 3  →  ⏱️  30-minute timeout\nWarn 4  →  ⏱️  45-minute timeout\nWarn 5  →  ⏱️  60-minute timeout\nWarn 6  →  ⏱️  75-minute timeout\nWarn 7  →  ⏱️  90-minute timeout\nWarn 8  →  🔴  28-day (permanent) mute\n```', inline: false },
        )
        .setFooter({ text: 'GoldenHeart SMP — Breaking rules affects everyone. Be kind. 💛' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ── RULEBOOK COMMANDS ──
    if (commandName === 'rulebook_mc') {
      const book = RULEBOOKS.mc;
      const embed = buildBookEmbed(book.title, book.pages, 0, book.color);
      const row = buildBookRow(0, book.pages.length, 'mc');
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '📖 MC Server Rulebook posted!', ephemeral: true });
    }
    
    if (commandName === 'rulebook_chat') {
      const book = RULEBOOKS.chat;
      const embed = buildBookEmbed(book.title, book.pages, 0, book.color);
      const row = buildBookRow(0, book.pages.length, 'chat');
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '📖 Chat Rulebook posted!', ephemeral: true });
    }
    
    if (commandName === 'rulebook_general') {
      const book = RULEBOOKS.general;
      const embed = buildBookEmbed(book.title, book.pages, 0, book.color);
      const row = buildBookRow(0, book.pages.length, 'general');
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '📖 General Rulebook posted!', ephemeral: true });
    }

    // ── FEEDBACK COMMAND ──
    if (commandName === 'feedback') {
      await interaction.reply({ content: `📬 Check your **DMs** — I've sent you the staff list to rate!`, ephemeral: true });
      const staffList = Object.entries(STAFF_MEMBERS);
      const memberLines = staffList.map(([key, info], i) => `${STAR_EMOJIS[i]}  **${info.label}** — ${info.type}`);
      const dmEmbed = new EmbedBuilder()
        .setTitle('⭐ Staff Feedback — Who do you want to rate?').setColor(0xf0b429)
        .setDescription(`React with the **number** next to the staff member you'd like to rate!\n\n${memberLines.join('\n')}\n\n> After reacting, I'll ask for a **1–5 star rating** and an optional comment.`)
        .setFooter({ text: 'Your feedback is anonymous and sent directly to the staff member.' }).setTimestamp();
      try {
        const dm = await interaction.user.createDM();
        const dmMsg = await dm.send({ embeds: [dmEmbed] });
        for (let i = 0; i < staffList.length && i < 5; i++) await dmMsg.react(STAR_EMOJIS[i]);
        pendingFeedback.set(interaction.user.id, { stage: 'pick_staff', messageId: dmMsg.id, staffList });
      } catch (err) {
        await interaction.followUp({ content: `❌ I couldn't DM you! Please enable **Direct Messages** from server members in your Privacy Settings.`, ephemeral: true });
      }
      return;
    }

    // ── VIEWFEEDBACK COMMAND ──
    if (commandName === 'viewfeedback') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      const staffKey = interaction.options.getString('staff');
      
      if (staffKey) {
        const feedbacks = await getFeedbackForStaff(staffKey);
        const staffInfo = STAFF_MEMBERS[staffKey];
        if (!feedbacks || feedbacks.length === 0)
          return interaction.reply({ content: `📋 No feedback found for **${staffInfo?.label ?? staffKey}**.`, ephemeral: true });
        
        const avgRating = (feedbacks.reduce((s, e) => s + e.rating, 0) / feedbacks.length).toFixed(1);
        const recentList = feedbacks.slice(0, 5).map((e, i) =>
          `**${i + 1}.** ${starsDisplay(e.rating)} — *"${e.comment || 'No comment'}"* *(${e.timestamp.toLocaleDateString()})*`
        ).join('\n');
        
        const embed = new EmbedBuilder()
          .setTitle(`📋 Feedback — ${staffInfo.label} (${staffInfo.type})`).setColor(0x5b8dee)
          .addFields(
            { name: '⭐ Average Rating', value: `${avgRating}/5`, inline: true },
            { name: '📝 Total Reviews', value: `${feedbacks.length}`, inline: true },
            { name: '🕐 Recent Feedback (last 5)', value: recentList || 'None', inline: false },
          ).setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const allStats = await getStaffStats();
        const lines = Object.entries(STAFF_MEMBERS).map(([key, info]) => {
          const stats = allStats[key];
          if (!stats || stats.count === 0) return `**${info.label}** (${info.type}) — No feedback yet`;
          const avg = (stats.ratings.reduce((s, r) => s + r, 0) / stats.ratings.length).toFixed(1);
          return `**${info.label}** (${info.type}) — ${starsDisplay(Math.round(Number(avg)))} **${avg}/5** *(${stats.count} review${stats.count !== 1 ? 's' : ''})*`;
        }).join('\n');
        const embed = new EmbedBuilder()
          .setTitle('📋 Staff Performance Overview').setColor(0xf0b429)
          .setDescription(lines || 'No feedback data yet.').setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // ── STAFFSTATS COMMAND ──
    if (commandName === 'staffstats') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      const allStats = await getStaffStats();
      const rows = Object.entries(STAFF_MEMBERS).map(([key, info]) => {
        const stats = allStats[key];
        if (!stats || stats.count === 0) return `**${info.label}** (${info.type})\n> No reviews yet`;
        const avg = (stats.ratings.reduce((s, r) => s + r, 0) / stats.ratings.length).toFixed(1);
        return `**${info.label}** (${info.type})\n> ${starsDisplay(Math.round(Number(avg)))} **${avg}/5** — ${stats.count} review${stats.count !== 1 ? 's' : ''}`;
      }).join('\n\n');
      
      const embed = new EmbedBuilder()
        .setTitle('📊 Staff Performance Stats').setColor(0x9b59b6)
        .setDescription(rows || 'No feedback data yet.')
        .setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── SUGGEST COMMAND ──
    if (commandName === 'suggest') {
      const text = interaction.options.getString('suggestion');
      const suggestion = await createSuggestion(interaction.user.id, interaction.user.tag, text);
      
      const embed = new EmbedBuilder()
        .setTitle('💡 New Suggestion').setColor(0xf0b429).setDescription(text)
        .addFields(
          { name: '👤 Submitted by', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🆔 Suggestion ID', value: `\`${suggestion.id}\``, inline: true },
          { name: '📌 Status', value: '🟡 Pending Review', inline: true },
        )
        .setFooter({ text: 'Staff can accept or reject this suggestion using the buttons below.' })
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`suggest_accept:${suggestion.id}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`suggest_reject:${suggestion.id}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger),
      );
      
      try {
        const ch = await client.channels.fetch(SUGGESTIONS_CHANNEL_ID);
        await ch.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Your suggestion (\`${suggestion.id}\`) has been submitted for review!`, ephemeral: true });
      } catch (err) {
        console.error('Could not post suggestion:', err);
        return interaction.reply({ content: '❌ Failed to submit suggestion.', ephemeral: true });
      }
      return;
    }

    // ── VIEWSUGGESTIONS COMMAND ──
    if (commandName === 'viewsuggestions') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      const statusFilter = interaction.options.getString('status') || 'all';
      const query = statusFilter === 'all' ? {} : { status: statusFilter };
      const suggestions = await Suggestion.find(query).sort({ timestamp: -1 }).limit(20).lean();
      
      if (suggestions.length === 0)
        return interaction.reply({ content: '📋 No suggestions yet.', ephemeral: true });
      
      const statusEmoji = { pending: '🟡', accepted: '✅', rejected: '❌' };
      const lines = suggestions.map((s, i) =>
        `**${i + 1}.** \`${s.id}\` — ${statusEmoji[s.status] || '🟡'} **${s.status || 'pending'}**\n> ${s.text.slice(0, 80)}${s.text.length > 80 ? '...' : ''}\n> *by ${s.fromUsername}*`
      ).join('\n\n');
      
      const embed = new EmbedBuilder()
        .setTitle('💡 Suggestions').setColor(0xf0b429)
        .setDescription(lines || 'No suggestions match this filter.')
        .setFooter({ text: `Showing last 20 | Filter: ${statusFilter}` }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── BIRTHDAY COMMAND ──
    if (commandName === 'birthday') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'set') {
        const day = interaction.options.getInteger('day');
        const month = interaction.options.getInteger('month');
        if (day < 1 || day > 31 || month < 1 || month > 12)
          return interaction.reply({ content: '❌ Invalid date.', ephemeral: true });
        await setBirthday(interaction.user.id, interaction.user.tag, day, month);
        return interaction.reply({ content: `🎂 Birthday set to **${day}/${month}**! The server will celebrate on your day.`, ephemeral: true });
      }
      if (sub === 'remove') {
        await removeBirthday(interaction.user.id);
        return interaction.reply({ content: '✅ Your birthday has been removed.', ephemeral: true });
      }
      if (sub === 'view') {
        const target = interaction.options.getUser('user') || interaction.user;
        const birthday = await getBirthday(target.id);
        if (!birthday) return interaction.reply({ content: `📋 **${target.username}** hasn't set a birthday yet.`, ephemeral: true });
        return interaction.reply({ content: `🎂 **${target.username}**'s birthday: **${birthday.day}/${birthday.month}**`, ephemeral: true });
      }
    }

    // ── AFK COMMAND ──
    if (commandName === 'afk') {
      const reason = interaction.options.getString('reason') || 'AFK';
      await setAFK(interaction.user.id, interaction.user.username, reason);
      return interaction.reply({ content: `💤 **${interaction.user.username}** is now AFK: *${reason}*` });
    }

    // ── REMINDME COMMAND ──
    if (commandName === 'remindme') {
      const timeStr = interaction.options.getString('time');
      const text = interaction.options.getString('reminder');
      const ms = parseDuration(timeStr);
      if (!ms) return interaction.reply({ content: '❌ Invalid time format. Use e.g. `30m`, `2h`, `1d`.', ephemeral: true });
      
      const fireAt = Date.now() + ms;
      await createReminder(interaction.user.id, text, fireAt);
      setTimeout(() => checkReminders(client), ms + 1000);
      return interaction.reply({
        content: `⏰ Got it! I'll remind you in **${timeStr}**: *${text}*\n> Reminder set for <t:${Math.floor(fireAt / 1000)}:F>`,
        ephemeral: true,
      });
    }

    // ── APPLYPANEL COMMAND ──
    if (commandName === 'applypanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('apply_select')
          .setPlaceholder('📋 Select a role to apply for...')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('🛡️ Chat Moderator').setDescription('Apply to moderate the Discord server').setValue('chatmod'),
            new StringSelectMenuOptionBuilder().setLabel('🤝 Helper').setDescription('Apply to help and support members').setValue('helper'),
            new StringSelectMenuOptionBuilder().setLabel('⛏️ Minecraft Chat Moderator').setDescription('Apply to moderate in-game chat').setValue('mcmod'),
          )
      );
      await interaction.channel.send({
        content: `📋 **Staff Applications**\n\nSelect a role below to start your application. You'll receive the questions in your **DMs** — make sure they're open!\n\n> 🕐 Applications are reviewed within 48 hours.`,
        components: [menu],
      });
      return interaction.reply({ content: '✅ Application panel sent!', ephemeral: true });
    }

    // ── TICKETPANEL COMMAND ──
    if (commandName === 'ticketpanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_select')
          .setPlaceholder('✨ Choose your ticket type to get started...')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('General Support')
              .setDescription('Questions, help, and general server assistance')
              .setEmoji('🎟️')
              .setValue('support'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Shop & Purchases')
              .setDescription('Help with shop purchases, rewards, or item claims')
              .setEmoji('🛍️')
              .setValue('shop'),
          )
      );

      const panelEmbed = new EmbedBuilder()
        .setColor(0xf0b429)
        .setTitle('🏰 GoldenHeart SMP — Support Desk')
        .setDescription([
          '> Need help from the staff team? **Select a category below** to open a private ticket.',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          '🎟️ **General Support**',
          '> Questions, help & general server assistance',
          '',
          '🛍️ **Shop & Purchases**',
          '> Help with shop purchases, rewards, or item claims',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ].join('\n'))
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }) || null)
        .addFields(
          { name: '🔒 Private', value: 'Only you & staff can view your ticket', inline: true },
          { name: '⚡ Fast', value: 'Staff are notified instantly', inline: true },
          { name: '📋 Organized', value: 'Pick a category for faster help', inline: true },
        )
        .setFooter({ text: 'GoldenHeart SMP • Support Desk • We\'re here to help 💛' })
        .setTimestamp();

      await interaction.channel.send({
        embeds: [panelEmbed],
        components: [selectRow],
      });
      return interaction.reply({ content: '✅ Ticket panel posted!', ephemeral: true });
    }

    // ── VERIFYPANEL COMMAND ──
    if (commandName === 'verifypanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify')
          .setLabel('✅ Click to Verify')
          .setStyle(ButtonStyle.Success)
      );
      
      const embed = new EmbedBuilder()
        .setTitle('🔐 Verification Required')
        .setColor(0x57f287)
        .setDescription(`Click the button below to verify yourself and gain access to the server!\n\n<#${VERIFY_CHANNEL_ID}>`)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ Verify panel sent!', ephemeral: true });
    }

    // ── SERVERSTATUS COMMAND ──
    if (commandName === 'serverstatus') {
      await interaction.deferReply();
      const status = await getMCServerStatus('goldenheartsmp.minecraftnoob.com', 25565);
      if (!status || !status.online) {
        const embed = new EmbedBuilder()
          .setTitle('🔴 GoldenHeart SMP — Offline').setColor(0xed4245)
          .setDescription('The server appears to be **offline** or unreachable at this time.')
          .setFooter({ text: 'goldenheartsmp.minecraftnoob.com:25565' }).setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
      const playerList = status.players?.list?.map(p => `• ${p.name}`).join('\n') || '*No player data available*';
      const embed = new EmbedBuilder()
        .setTitle('🟢 GoldenHeart SMP — Online').setColor(0x57f287)
        .addFields(
          { name: '🌍 IP', value: '`goldenheartsmp.minecraftnoob.com:25565`', inline: false },
          { name: '👥 Players', value: `${status.players?.online ?? 0} / ${status.players?.max ?? 0}`, inline: true },
          { name: '🖥️ Version', value: status.version || 'Unknown', inline: true },
          { name: '📡 Motd', value: status.motd?.clean || '*No MOTD*', inline: false },
          { name: '📋 Online Players', value: playerList.slice(0, 1024), inline: false },
        )
        .setFooter({ text: 'Powered by mcsrvstat.us' }).setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // ── MCPLAYER COMMAND ──
    if (commandName === 'mcplayer') {
      const username = interaction.options.getString('username');
      await interaction.deferReply();
      try {
        const profile = await fetchJSON(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
        if (!profile || !profile.id) {
          return interaction.editReply(`❌ Player **${username}** not found. Check the spelling and try again.`);
        }
        const uuid = profile.id;
        const formatted = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
        const skinHead = `https://mc-heads.net/avatar/${uuid}/64`;
        const embed = new EmbedBuilder()
          .setTitle(`⛏️ Minecraft Player — ${profile.name}`).setColor(0x3dd68c)
          .setThumbnail(skinHead)
          .addFields(
            { name: '👤 Username', value: profile.name, inline: true },
            { name: '🆔 UUID', value: `\`${formatted}\``, inline: false },
            { name: '✅ Account', value: 'Valid Java Edition account', inline: true },
          )
          .setFooter({ text: 'Data from Mojang API' }).setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply(`❌ Could not look up **${username}**. The player may not exist or the Mojang API may be down.`);
      }
    }

    // ── ANNOUNCE COMMAND ──
    if (commandName === 'announce') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: 'Only admins can use this command.', ephemeral: true });
      
      const title = interaction.options.getString('title');
      await interaction.reply({
        content: title ? `📢 Title set: **${title}**\n\nNow send your announcement message in chat.` : '📢 Send your announcement message in chat now.',
        ephemeral: true,
      });
      const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60000 });
      collector.on('collect', async message => {
        const text = title
          ? `📢 @everyone\n\n━━━━━━━━━━━━━━━\n# **${title.toUpperCase()}**\n━━━━━━━━━━━━━━━\n\n${message.content}\n\n━━━━━━━━━━━━━━━`
          : `📢 @everyone\n\n${message.content}`;
        await interaction.channel.send({ content: text });
        await message.delete().catch(() => { });
      });
      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0)
          interaction.followUp({ content: '⏰ Timed out — no message received.', ephemeral: true }).catch(() => { });
      });
    }

    // ── POLL COMMAND ──
    if (commandName === 'poll') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      const question = interaction.options.getString('question');
      const durationHours = interaction.options.getInteger('duration') || 0;
      const durationMinutes = interaction.options.getInteger('minutes') || 0;
      let duration = durationHours + (durationMinutes / 60);
      if (duration <= 0) duration = 24;
      const durationFinal = Math.max(1, Math.ceil(duration));
      const durationLabel = durationHours > 0 && durationMinutes > 0
        ? `${durationHours}h ${durationMinutes}m`
        : durationMinutes > 0 ? `${durationMinutes}m` : `${durationHours || 24}h`;
      const optA = interaction.options.getString('option_a');
      const optB = interaction.options.getString('option_b');
      const optC = interaction.options.getString('option_c');
      const optD = interaction.options.getString('option_d');
      const rawOptions = [optA, optB, optC, optD].filter(Boolean);

      let nativePollSent = false;
      try {
        const answers = rawOptions.map(text => ({ poll_media: { text } }));
        await client.rest.post(
          `/channels/${interaction.channelId}/messages`,
          {
            body: {
              content: '@everyone 📊 A new poll is live — cast your vote!',
              poll: { question: { text: question }, answers, duration: durationFinal, allow_multiselect: false },
            },
          }
        );
        nativePollSent = true;
        await interaction.reply({ content: '✅ Poll posted!', ephemeral: true });
      } catch (err) {
        console.log('Native poll API unavailable, falling back to reaction poll:', err.message);
      }

      if (!nativePollSent) {
        const emojis = ['🇦', '🇧', '🇨', '🇩'];
        const optionLines = rawOptions.map((o, i) => `${emojis[i]} **${o}**`).join('\n\n');
        const embed = new EmbedBuilder()
          .setTitle(`📊 ${question}`).setColor(0x5865f2).setDescription(optionLines)
          .addFields({ name: '🗳️ How to vote', value: 'React with **one** letter emoji. One vote per person!', inline: false })
          .setFooter({ text: `Poll by ${interaction.user.tag} • Closes in ${durationLabel}` }).setTimestamp();
        try {
          const pollMsg = await interaction.channel.send({ content: '@everyone', embeds: [embed] });
          for (let i = 0; i < rawOptions.length; i++) await pollMsg.react(emojis[i]);
          pollVotes.set(pollMsg.id, new Map());
          return interaction.reply({ content: '✅ Poll posted!', ephemeral: true });
        } catch (err2) {
          console.error('Poll fallback error:', err2);
          return interaction.reply({ content: '❌ Failed to post poll.', ephemeral: true });
        }
      }
    }

    // ── GIVEAWAY COMMAND ──
    if (commandName === 'giveaway') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'start') {
        if (!hasModPermission(interaction.member))
          return interaction.reply({ content: '❌ No permission.', ephemeral: true });
        
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getString('duration');
        const winners = interaction.options.getInteger('winners') || 1;
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const ms = parseDuration(duration);
        if (!ms) return interaction.reply({ content: '❌ Invalid duration. Use e.g. `1h`, `30m`, `2d`.', ephemeral: true });
        
        const endsAt = Date.now() + ms;
        const endsAtTs = Math.floor(endsAt / 1000);
        const embed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY').setColor(0xf0b429)
          .setDescription(`**${prize}**\n\nReact with 🎉 to enter!\n\n⏰ **Ends:** <t:${endsAtTs}:R> (<t:${endsAtTs}:F>)\n🏆 **Winners:** ${winners}\n🎟️ **Hosted by:** <@${interaction.user.id}>`)
          .setFooter({ text: `Ends at` }).setTimestamp(endsAt);
        const msg = await channel.send({ embeds: [embed] });
        await msg.react('🎉');
        const giveaway = await createGiveaway(msg.id, channel.id, prize, winners, interaction.user.id, endsAt);
        setTimeout(() => endGiveaway(client, giveaway), ms);
        return interaction.reply({ content: `✅ Giveaway started in <#${channel.id}>!`, ephemeral: true });
      }
      if (sub === 'reroll') {
        if (!hasModPermission(interaction.member))
          return interaction.reply({ content: '❌ No permission.', ephemeral: true });
        
        const messageId = interaction.options.getString('message_id');
        const giveaway = await Giveaway.findOne({ messageId });
        if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
        await endGiveaway(client, giveaway);
        return interaction.reply({ content: '🔄 Giveaway rerolled!', ephemeral: true });
      }
    }

    // ── TESTWELCOMEMESSAGE COMMAND ──
    if (commandName === 'testwelcomemessage') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetMember = interaction.guild.members.cache.get(targetUser.id);
      if (!targetMember) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      try {
        const cardBuffer = await generateWelcomeCard(targetMember);
        const cardAttachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });
        const files = [cardAttachment];
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0xf0b429)
          .setAuthor({
            name: `⛏️ ${targetMember.user.username} joined GoldenHeart SMP!`,
            iconURL: targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }),
          })
          .setTitle('🏰 Welcome to GoldenHeart SMP')
          .setDescription([
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `**Hey <@${targetMember.id}>, we're glad you're here!** 💛`,
            ``,
            `GoldenHeart SMP is a community-driven Minecraft survival server`,
            `built on friendship, strategy, and epic adventures.`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `> 🔐 **Verify here:** <#${VERIFY_CHANNEL_ID}> to unlock all channels`,
            `> 📜 **Read the rules:** \`/rules\``,
            `> ⛏️ **Join the MC server:** \`goldenheartsmp.minecraftnoob.com\``,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          ].join('\n'))
          .setImage('attachment://welcome-card.png')
          .setThumbnail(targetMember.guild.iconURL({ dynamic: true, size: 256 }) || targetMember.user.displayAvatarURL({ dynamic: true }))
          .setFooter({
            text: `⚔️ GoldenHeart SMP • Test Welcome • ${targetMember.guild.memberCount} members • 1.20.4+`,
            iconURL: targetMember.guild.iconURL({ dynamic: true }) || undefined,
          })
          .setTimestamp();
        await interaction.editReply({ content: `📨 **Test Welcome Message for ${targetMember.user.username}**`, embeds: [welcomeEmbed], files });
      } catch (err) {
        console.error('Test welcome message error:', err);
        return interaction.editReply({ content: `❌ Failed to generate welcome message: ${err.message}`, ephemeral: true });
      }
    }

    // ── EXPORTLEADERBOARD COMMAND ──
    if (commandName === 'exportleaderboard') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const xpData = await User.find({ xp: { $gt: 0 } })
          .sort({ xp: -1 })
          .lean();
        
        const coinsData = await User.find({ coins: { $gt: 0 } })
          .sort({ coins: -1 })
          .lean();
        
        const exportData = {
          exportedAt: new Date().toISOString(),
          exportedBy: interaction.user.tag,
          guildId: interaction.guild.id,
          guildName: interaction.guild.name,
          xpLeaderboard: xpData.map(user => ({
            userId: user.userId,
            username: user.username || 'Unknown',
            xp: user.xp,
            level: getLevelFromXP(user.xp),
            messages: Math.floor(user.xp / 15),
          })),
          coinsLeaderboard: coinsData.map(user => ({
            userId: user.userId,
            username: user.username || 'Unknown',
            coins: user.coins,
            messages: user.messages || 0,
            voiceMinutes: user.voiceMinutes || 0,
            invites: user.invites || 0,
          })),
          summary: {
            totalUsersWithXP: xpData.length,
            totalUsersWithCoins: coinsData.length,
            totalXP: xpData.reduce((sum, u) => sum + u.xp, 0),
            totalCoins: coinsData.reduce((sum, u) => sum + u.coins, 0),
          }
        };
        
        const jsonData = JSON.stringify(exportData, null, 2);
        const jsonBuffer = Buffer.from(jsonData, 'utf8');
        const attachment = new AttachmentBuilder(jsonBuffer, { name: `leaderboard-export-${Date.now()}.json` });
        
        const logChannel = await client.channels.fetch(STAFF_LOG_CHANNEL);
        
        const logEmbed = new EmbedBuilder()
          .setTitle('📊 Leaderboard Export')
          .setColor(0x5865f2)
          .setDescription(`Leaderboard data exported by <@${interaction.user.id}>`)
          .addFields(
            { name: '📈 XP Leaderboard', value: `Total users: **${exportData.summary.totalUsersWithXP}**\nTotal XP: **${exportData.summary.totalXP.toLocaleString()}**`, inline: true },
            { name: '🪙 Coins Leaderboard', value: `Total users: **${exportData.summary.totalUsersWithCoins}**\nTotal Coins: **${exportData.summary.totalCoins.toLocaleString()}**`, inline: true },
            { name: '📅 Exported At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          )
          .setFooter({ text: `Exported by ${interaction.user.tag}` })
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed], files: [attachment] });
        
        const xpPreview = xpData.slice(0, 5).map((user, i) => 
          `${i + 1}. <@${user.userId}> — **${user.xp} XP** (Level ${getLevelFromXP(user.xp)})`
        ).join('\n') || 'No XP data';
        
        const coinsPreview = coinsData.slice(0, 5).map((user, i) => 
          `${i + 1}. <@${user.userId}> — **${user.coins} coins**`
        ).join('\n') || 'No coins data';
        
        const previewEmbed = new EmbedBuilder()
          .setTitle('📊 Leaderboard Preview (Top 5)')
          .setColor(0xf0b429)
          .addFields(
            { name: '🏆 XP Leaderboard Top 5', value: xpPreview, inline: false },
            { name: '🪙 Coins Leaderboard Top 5', value: coinsPreview, inline: false },
          )
          .setTimestamp();
        
        await logChannel.send({ embeds: [previewEmbed] });
        
        await interaction.editReply({
          content: `✅ Leaderboard data exported to <#${STAFF_LOG_CHANNEL}>!\n\n📊 **Summary:**\n• ${exportData.summary.totalUsersWithXP} users with XP\n• ${exportData.summary.totalUsersWithCoins} users with coins\n• Total XP: ${exportData.summary.totalXP.toLocaleString()}\n• Total Coins: ${exportData.summary.totalCoins.toLocaleString()}`,
          ephemeral: true,
        });
        
      } catch (err) {
        console.error('Export leaderboard error:', err);
        return interaction.editReply({ content: `❌ Failed to export leaderboard: ${err.message}`, ephemeral: true });
      }
    }

        // ── IMPORT DATA COMMAND ──
    if (commandName === 'import_data') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can import data.', ephemeral: true });
      }
      
      const attachment = interaction.options.getAttachment('file');
      const dataType = interaction.options.getString('type');
      
      if (!attachment) {
        return interaction.reply({ content: '❌ Please attach a JSON file.', ephemeral: true });
      }
      
      if (!attachment.contentType || !attachment.contentType.includes('json')) {
        return interaction.reply({ content: '❌ File must be a JSON file.', ephemeral: true });
      }
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const response = await fetch(attachment.url);
        const text = await response.text();
        const parsed = JSON.parse(text);
        let count = 0;
        
        if (dataType === 'coins') {
          for (const [userId, data] of Object.entries(parsed)) {
            if (userId === 'invite_codes') continue;
            const user = await getUser(userId);
            user.username = data.username || 'Unknown';
            user.coins = data.coins || 0;
            user.messages = data.messages || 0;
            user.voiceMinutes = data.voiceMinutes || 0;
            user.invites = data.invites || 0;
            await user.save();
            count++;
          }
        } else if (dataType === 'xp') {
          for (const [userId, data] of Object.entries(parsed)) {
            const user = await getUser(userId);
            user.username = data.username || 'Unknown';
            user.xp = data.xp || 0;
            user.level = getLevelFromXP(user.xp);
            await user.save();
            count++;
          }
        } else {
          return interaction.editReply({ content: '❌ Invalid data type. Use "coins" or "xp".' });
        }
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Data Imported Successfully')
          .setColor(0x57f287)
          .setDescription(`Successfully imported **${dataType.toUpperCase()}** data!`)
          .addFields(
            { name: '📊 Records Imported', value: `${count}`, inline: true },
            { name: '📅 Imported At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '👤 Imported By', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        await sendLog(client, embed);
      } catch (error) {
        await interaction.editReply({ content: `❌ Failed to import data: ${error.message}` });
      }
      return;
    }

    // ── EXPORT DATA COMMAND ──
    if (commandName === 'export_data') {
      if (!isServerOwner(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only the server owner can export data.', ephemeral: true });
      }
      
      const dataType = interaction.options.getString('type');
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        let data;
        let filename;
        
        if (dataType === 'coins') {
          const users = await User.find({}).lean();
          data = {};
          for (const user of users) {
            data[user.userId] = {
              username: user.username,
              coins: user.coins,
              messages: user.messages,
              voiceMinutes: user.voiceMinutes,
              invites: user.invites,
            };
          }
          filename = `coins_export_${Date.now()}.json`;
        } else if (dataType === 'xp') {
          const users = await User.find({}).lean();
          data = {};
          for (const user of users) {
            data[user.userId] = {
              username: user.username,
              xp: user.xp,
              level: user.level,
            };
          }
          filename = `xp_export_${Date.now()}.json`;
        } else {
          return interaction.editReply({ content: '❌ Invalid data type. Use "coins" or "xp".' });
        }
        
        const jsonString = JSON.stringify(data, null, 2);
        const buffer = Buffer.from(jsonString, 'utf8');
        const attachment = new AttachmentBuilder(buffer, { name: filename });
        
        const embed = new EmbedBuilder()
          .setTitle('📤 Data Exported')
          .setColor(0x5865f2)
          .setDescription(`**${dataType.toUpperCase()}** data has been exported!`)
          .addFields(
            { name: '📊 Records Exported', value: `${Object.keys(data).length}`, inline: true },
            { name: '📅 Exported At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '👤 Exported By', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], files: [attachment] });
        await sendLog(client, embed);
      } catch (error) {
        await interaction.editReply({ content: `❌ Failed to export data: ${error.message}` });
      }
      return;
    }

    // ── EMBED COMMAND ──
    if (commandName === 'embed') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color') || '#f0b429';
      const footer = interaction.options.getString('footer');
      const imageUrl = interaction.options.getString('image');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const colorInt = parseInt(color.replace('#', ''), 16) || 0xf0b429;
      
      const embed = new EmbedBuilder()
        .setTitle(title || null)
        .setDescription(description || null)
        .setColor(colorInt);
      if (footer) embed.setFooter({ text: footer });
      if (imageUrl && imageUrl.startsWith('http')) {
        try { embed.setImage(imageUrl); } catch { }
      }
      embed.setTimestamp();
      
      try {
        await channel.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Embed posted in <#${channel.id}>!`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to send embed.', ephemeral: true });
      }
    }

    // ── BAN COMMAND ──
    if (commandName === 'ban') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const duration = interaction.options.getString('duration');
      if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      if (target.user.bot) return interaction.reply({ content: '❌ Cannot ban a bot.', ephemeral: true });
      if (target.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Cannot ban an admin.', ephemeral: true });
      
      await interaction.deferReply();
      try {
        try { await target.send(`🔨 **You have been ${duration ? 'temporarily ' : ''}banned from GoldenHeart SMP.**\n\n**Reason:** ${reason}${duration ? `\n**Duration:** ${duration}` : ''}`); } catch { }
        await target.ban({ reason });
        if (duration) {
          const ms = parseDuration(duration);
          if (!ms) return interaction.editReply('❌ Invalid duration format. Use e.g. `1d`, `7d`, `2h`.');
          const unbanAt = new Date(Date.now() + ms);
          await addTempBan(target.id, target.user.tag, GUILD_ID, reason, duration, unbanAt);
          setTimeout(() => checkTempBans(client), ms + 1000);
        }
        const logEmbed = new EmbedBuilder()
          .setTitle(duration ? `🔨 Member Temp-Banned (${duration})` : '🔨 Member Permanently Banned').setColor(0xed4245)
          .addFields(
            { name: 'User', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
            { name: 'By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Duration', value: duration || 'Permanent', inline: true },
            { name: 'Reason', value: reason, inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
        return interaction.editReply(`🔨 **${target.user.tag}** has been ${duration ? `temp-banned for **${duration}**` : '**permanently banned**'}.\n📋 **Reason:** ${reason}`);
      } catch (err) {
        return interaction.editReply('❌ Failed to ban. Check bot role position.');
      }
    }

    // ── KICK COMMAND ──
    if (commandName === 'kick') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      if (target.user.bot) return interaction.reply({ content: '❌ Cannot kick a bot.', ephemeral: true });
      if (target.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Cannot kick an admin.', ephemeral: true });
      
      try {
        try { await target.send(`👢 **You have been kicked from GoldenHeart SMP.**\n\n**Reason:** ${reason}`); } catch { }
        await target.kick(reason);
        const logEmbed = new EmbedBuilder()
          .setTitle('👢 Member Kicked').setColor(0xffa500)
          .addFields(
            { name: 'User', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
            { name: 'By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason, inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
        return interaction.reply(`👢 **${target.user.tag}** has been kicked.\n📋 **Reason:** ${reason}`);
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to kick. Check bot role position.', ephemeral: true });
      }
    }

    // ── PURGE COMMAND ──
    if (commandName === 'purge') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100)
        return interaction.reply({ content: '❌ Amount must be between 1 and 100.', ephemeral: true });
      try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        const reply = await interaction.reply({ content: `🗑️ Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.`, fetchReply: true });
        autoDelete(reply, 5000);
        const logEmbed = new EmbedBuilder()
          .setTitle('🗑️ Purge').setColor(0xfee75c)
          .addFields(
            { name: 'By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
            { name: 'Count', value: `${deleted.size}`, inline: true },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to delete messages. Messages older than 14 days cannot be bulk-deleted.', ephemeral: true });
      }
    }

    // ── LOCK COMMAND ──
    if (commandName === 'lock') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'No reason provided';
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply(`🔒 <#${channel.id}> has been **locked**.\n📋 **Reason:** ${reason}`);
        const logEmbed = new EmbedBuilder()
          .setTitle('🔒 Channel Locked').setColor(0xed4245)
          .addFields(
            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason, inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to lock channel.', ephemeral: true });
      }
    }

    // ── UNLOCK COMMAND ──
    if (commandName === 'unlock') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        await interaction.reply(`🔓 <#${channel.id}> has been **unlocked**.`);
        const logEmbed = new EmbedBuilder()
          .setTitle('🔓 Channel Unlocked').setColor(0x57f287)
          .addFields(
            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'By', value: `<@${interaction.user.id}>`, inline: true },
          ).setTimestamp();
        await sendLog(client, logEmbed);
        if (raidLockActive) raidLockActive = false;
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to unlock channel.', ephemeral: true });
      }
    }

    // ── SLOWMODE COMMAND ──
    if (commandName === 'slowmode') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const seconds = interaction.options.getInteger('seconds');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      try {
        await channel.setRateLimitPerUser(seconds);
        const label = seconds === 0 ? 'disabled' : `set to **${seconds}s**`;
        return interaction.reply(`⏱️ Slowmode in <#${channel.id}> ${label}.`);
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to set slowmode.', ephemeral: true });
      }
    }

    // ── SERVERINFO COMMAND ──
    if (commandName === 'serverinfo') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      await guild.members.fetch();
      const allMembers = guild.members.cache;
      const totalMembers = allMembers.filter(m => !m.user.bot).size;
      const totalBots = allMembers.filter(m => m.user.bot).size;
      const onlineMembers = allMembers.filter(m => !m.user.bot && m.presence?.status && m.presence.status !== 'offline').size;
      const totalAll = allMembers.size;
      
      const warns = await Warn.find({}).lean();
      const warnedUsers = new Set(warns.map(w => w.userId)).size;
      const totalWarns = warns.length;
      
      const warnList = await Warn.aggregate([
        { $group: { _id: '$userId', username: { $first: '$username' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      const warnListStr = warnList.length > 0 
        ? warnList.map((w, i) => `\`${i + 1}.\` <@${w._id}> — **${w.count}** warn(s)`).join('\n')
        : 'No warns on record.';
      
      const totalCoins = (await User.aggregate([{ $group: { _id: null, total: { $sum: '$coins' } } }]))[0]?.total || 0;
      
      const embed = new EmbedBuilder()
        .setTitle(`📊 Server Info — ${guild.name}`).setColor(0x5865f2)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👥 Total Members', value: `${totalAll}`, inline: true },
          { name: '🧑 Human Members', value: `${totalMembers}`, inline: true },
          { name: '🤖 Bots', value: `${totalBots}`, inline: true },
          { name: '🟢 Active (Online)', value: `${onlineMembers}`, inline: true },
          { name: '📅 Server Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '⚠️ Total Warns Issued', value: `${totalWarns}`, inline: true },
          { name: '👤 Warned Users', value: `${warnedUsers}`, inline: true },
          { name: '🪙 Total Coins', value: `${totalCoins}`, inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '📋 Top Warned Members', value: warnListStr, inline: false },
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // ── EDITMESSAGE COMMAND ──
    if (commandName === 'editmessage') {
      if (!isGuildOwner(interaction))
        return interaction.reply({ content: '❌ Only the server owner can use this command.', ephemeral: true });
      
      const channelId = interaction.options.getString('channel_id');
      const messageId = interaction.options.getString('message_id');
      try {
        const ch = await client.channels.fetch(channelId);
        const msg = await ch.messages.fetch(messageId);
        if (msg.author.id !== client.user.id)
          return interaction.reply({ content: '❌ I can only edit my own messages.', ephemeral: true });
        
        const modal = new ModalBuilder()
          .setCustomId(`editmsg_modal:${channelId}:${messageId}`)
          .setTitle('✏️ Edit Bot Message');
        const contentInput = new TextInputBuilder()
          .setCustomId('new_content')
          .setLabel('New Message Content')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.content || '')
          .setRequired(true)
          .setMaxLength(2000);
        modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
        return interaction.showModal(modal);
      } catch (err) {
        return interaction.reply({ content: `❌ Could not find that message: ${err.message}`, ephemeral: true });
      }
    }

    // ── EDITEMBED COMMAND ──
    if (commandName === 'editembed') {
      if (!isGuildOwner(interaction))
        return interaction.reply({ content: '❌ Only the server owner can use this command.', ephemeral: true });
      
      const channelId = interaction.options.getString('channel_id');
      const messageId = interaction.options.getString('message_id');
      try {
        const ch = await client.channels.fetch(channelId);
        const msg = await ch.messages.fetch(messageId);
        if (msg.author.id !== client.user.id)
          return interaction.reply({ content: '❌ I can only edit my own messages.', ephemeral: true });
        if (!msg.embeds.length)
          return interaction.reply({ content: '❌ That message has no embed.', ephemeral: true });
        
        const existingEmbed = msg.embeds[0];
        const modal = new ModalBuilder()
          .setCustomId(`editembed_modal:${channelId}:${messageId}`)
          .setTitle('✏️ Edit Embed');
        const titleInput = new TextInputBuilder()
          .setCustomId('embed_title').setLabel('Embed Title (leave blank to keep)')
          .setStyle(TextInputStyle.Short).setValue(existingEmbed.title || '').setRequired(false).setMaxLength(256);
        const descInput = new TextInputBuilder()
          .setCustomId('embed_description').setLabel('Embed Description (leave blank to keep)')
          .setStyle(TextInputStyle.Paragraph).setValue(existingEmbed.description || '').setRequired(false).setMaxLength(4000);
        const colorInput = new TextInputBuilder()
          .setCustomId('embed_color').setLabel('Color (hex e.g. #f0b429, leave blank to keep)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7);
        const footerInput = new TextInputBuilder()
          .setCustomId('embed_footer').setLabel('Footer text (leave blank to keep)')
          .setStyle(TextInputStyle.Short).setValue(existingEmbed.footer?.text || '').setRequired(false).setMaxLength(200);
        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(colorInput),
          new ActionRowBuilder().addComponents(footerInput),
        );
        return interaction.showModal(modal);
      } catch (err) {
        return interaction.reply({ content: `❌ Could not find that message: ${err.message}`, ephemeral: true });
      }
    }

    // ── EDITRULES COMMAND ──
    if (commandName === 'editrules') {
      if (!isGuildOwner(interaction))
        return interaction.reply({ content: '❌ Only the server owner can use this command.', ephemeral: true });
      
      const bookKey = interaction.options.getString('book');
      const pageNum = interaction.options.getInteger('page');
      const book = RULEBOOKS[bookKey];
      if (!book)
        return interaction.reply({ content: '❌ Invalid rulebook key.', ephemeral: true });
      
      const pageIndex = pageNum - 1;
      if (pageIndex < 0 || pageIndex >= book.pages.length)
        return interaction.reply({ content: `❌ Page ${pageNum} doesn't exist in this rulebook (has ${book.pages.length} pages).`, ephemeral: true });
      
      const page = book.pages[pageIndex];
      const modal = new ModalBuilder()
        .setCustomId(`editrules_modal:${bookKey}:${pageIndex}`)
        .setTitle(`✏️ Edit ${book.title.slice(0, 30)} — Page ${pageNum}`);
      const titleInput = new TextInputBuilder()
        .setCustomId('page_title').setLabel('Page Title')
        .setStyle(TextInputStyle.Short).setValue(page.title).setRequired(true).setMaxLength(256);
      const contentInput = new TextInputBuilder()
        .setCustomId('page_content').setLabel('Page Content (supports markdown)')
        .setStyle(TextInputStyle.Paragraph).setValue(page.content).setRequired(true).setMaxLength(4000);
      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(contentInput),
      );
      return interaction.showModal(modal);
    }
  }

  // ── SELECT MENU ──
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_select') {
      return openTicket(interaction, interaction.values[0]);
    }

    if (interaction.customId === 'apply_select') {
      const role = interaction.values[0];
      const userId = interaction.user.id;
      if (activeSessions.has(userId))
        return interaction.reply({ content: '⚠️ You already have an application in progress in your DMs!', ephemeral: true });
      
      try {
        const dm = await interaction.user.createDM();
        activeSessions.set(userId, { role, step: 0, answers: {} });
        await dm.send(`📋 **${APP_NAMES[role]} Application**\n\nHey **${interaction.user.username}**! Thanks for applying.\nAnswer each question by sending a message.\n\nLet's start! 🚀\n\n${QUESTIONS[role][0].q}`);
        return interaction.reply({ content: `✅ Application started! Check your **DMs** to continue.`, ephemeral: true });
      } catch {
        activeSessions.delete(userId);
        return interaction.reply({ content: `❌ I couldn't DM you! Please enable **Direct Messages** from server members in your Privacy Settings and try again.`, ephemeral: true });
      }
    }

    // ── SHOP CATEGORY SELECTION ──
    if (interaction.customId === 'shop_category') {
      const categoryKey = interaction.values[0];
      const embed = buildCategoryEmbed(categoryKey);
      if (!embed) return interaction.reply({ content: '❌ Category not found!', ephemeral: true });
      
      const itemMenu = buildItemSelectMenu(categoryKey);
      const backButton = buildBackButton();
      await interaction.update({ embeds: [embed], components: [itemMenu, backButton] });
      return;
    }

    // ── SHOP ITEM SELECTION ──
    if (interaction.customId.startsWith('shop_item_')) {
      const categoryKey = interaction.customId.replace('shop_item_', '');
      const itemId = interaction.values[0];
      const category = SHOP_CATEGORIES[categoryKey];
      const item = category?.items.find(i => i.id === itemId);
      
      if (!item) return interaction.reply({ content: '❌ Item not found!', ephemeral: true });
      
      await addToCart(interaction.user.id, itemId, categoryKey);
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 Added to Cart!')
        .setColor(0x57f287)
        .setDescription([
          `**${item.name}** has been added to your cart!`,
          '',
          `📦 **Item:** ${item.amount}x ${item.name.replace(/[^\w\s]/g, '').trim()}`,
          `💰 **Price:** ${item.price} coins each`,
          `📂 **Category:** ${category.emoji} ${category.name}`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          'Continue shopping or view your cart with the buttons below!',
        ].join('\n'))
        .setFooter({ text: 'Click "View Cart" to checkout' })
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_cart_view').setLabel('🛒 View Cart').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`shop_item_${categoryKey}`).setLabel('🔄 Add More').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_back').setLabel('◀ Back').setStyle(ButtonStyle.Secondary)
      );
      
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }
  }

  // ── BUTTONS ──
  if (interaction.isButton()) {
    // ── SHOP CART VIEW ──
    if (interaction.customId === 'shop_cart_view') {
      const userId = interaction.user.id;
      const cartData = await getCartWithDiscount(userId);
      
      if (cartData.items.length === 0) {
        return interaction.reply({ content: '🛒 Your cart is empty! Browse the shop to add items.', ephemeral: true });
      }
      
      const itemsList = cartData.items.map((item, i) =>
        `**${i + 1}.** ${item.name} x${item.quantity} — ${item.subtotal} coins`
      ).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 Your Shopping Cart')
        .setColor(0xf0b429)
        .setDescription([
          itemsList,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `💰 **Subtotal:** ${cartData.total} coins`,
          cartData.coupon ? `🎫 **Discount:** -${cartData.discount} coins` : '',
          `💳 **Total:** ${cartData.finalTotal} coins`,
          '',
          cartData.coupon ? `✅ **Coupon Applied:** \`${cartData.coupon.code}\`` : '',
          '',
          'Use the buttons below to checkout or manage your cart!',
        ].filter(Boolean).join('\n'))
        .setFooter({ text: `${cartData.items.length} items in cart` })
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cart_checkout').setLabel('💳 Checkout').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cart_coupon').setLabel('🎫 Apply Coupon').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cart_remove_item').setLabel('🗑️ Remove Item').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cart_clear').setLabel('🗑️ Clear All').setStyle(ButtonStyle.Danger)
      );
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_back').setLabel('◀ Back to Shop').setStyle(ButtonStyle.Secondary)
      );
      
      await interaction.reply({ embeds: [embed], components: [row, backRow], ephemeral: true });
      return;
    }

    // ── CART REMOVE ITEM ──
    if (interaction.customId === 'cart_remove_item') {
      const userId = interaction.user.id;
      const cart = await loadCart(userId);
      
      if (cart.items.length === 0) {
        return interaction.reply({ content: '🛒 Your cart is empty!', ephemeral: true });
      }
      
      const options = cart.items.map((item, i) => {
        const category = SHOP_CATEGORIES[item.categoryKey];
        const shopItem = category?.items.find(ci => ci.id === item.itemId);
        const name = shopItem ? shopItem.name : item.itemId;
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${name} x${item.quantity}`)
          .setDescription(`Remove this item from cart`)
          .setValue(`${i}`);
      });
      
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('cart_remove_select')
          .setPlaceholder('Select item to remove...')
          .addOptions(options)
      );
      
      await interaction.reply({
        content: 'Select the item you want to remove from your cart:',
        components: [menu],
        ephemeral: true
      });
      return;
    }

    // ── CART REMOVE SELECT ──
    if (interaction.customId === 'cart_remove_select') {
      const userId = interaction.user.id;
      const itemIndex = parseInt(interaction.values[0], 10);
      
      const success = await removeFromCart(userId, itemIndex);
      
      if (success) {
        await interaction.reply({ content: '✅ Item removed from cart!', ephemeral: true });
        
        const cartData = await getCartWithDiscount(userId);
        if (cartData.items.length === 0) {
          await interaction.followUp({ content: '🛒 Your cart is now empty.', ephemeral: true });
        } else {
          const itemsList = cartData.items.map((item, i) => 
            `**${i + 1}.** ${item.name} x${item.quantity} — ${item.subtotal} coins`
          ).join('\n');
          
          const embed = new EmbedBuilder()
            .setTitle('🛒 Updated Cart')
            .setColor(0xf0b429)
            .setDescription([
              itemsList,
              '',
              `💰 **Total:** ${cartData.finalTotal} coins`,
              cartData.coupon ? `✅ **Coupon Applied:** \`${cartData.coupon.code}\`` : '',
            ].filter(Boolean).join('\n'))
            .setTimestamp();
          
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
      } else {
        await interaction.reply({ content: '❌ Failed to remove item.', ephemeral: true });
      }
      return;
    }

    // ── CART COUPON ──
    if (interaction.customId === 'cart_coupon') {
      const modal = new ModalBuilder()
        .setCustomId('apply_coupon_modal')
        .setTitle('🎫 Apply Coupon');
      
      const codeInput = new TextInputBuilder()
        .setCustomId('coupon_code')
        .setLabel('Enter Coupon Code')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('e.g., SUMMER2024');
      
      modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
      await interaction.showModal(modal);
      return;
    }

    // ── CART CLEAR ──
    if (interaction.customId === 'cart_clear') {
      const userId = interaction.user.id;
      await clearCart(userId);
      await interaction.reply({ content: '🗑️ Your cart has been cleared!', ephemeral: true });
      return;
    }

    // ── CART CHECKOUT ──
    if (interaction.customId === 'cart_checkout') {
      const userId = interaction.user.id;
      const cartData = await getCartWithDiscount(userId);
      
      if (cartData.items.length === 0) {
        return interaction.reply({ content: '🛒 Your cart is empty! Add some items first.', ephemeral: true });
      }
      
      const user = await getUser(userId);
      
      if (user.coins < cartData.finalTotal) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Coins!')
          .setColor(0xed4245)
          .setDescription([
            `You don't have enough Golden Coins to complete your purchase!`,
            '',
            `💰 **Your Balance:** ${user.coins} coins`,
            `💳 **Cart Total:** ${cartData.finalTotal} coins`,
            `📉 **Shortage:** ${cartData.finalTotal - user.coins} coins`,
            '',
            '💡 **Ways to earn more coins:**',
            '• 💬 5 messages = 1 coin',
            '• 🎤 1 minute in VC = 1 coin',
            '• 📨 1 invite = 50 coins',
            '• 🎁 Daily reward = 50 coins',
          ].join('\n'))
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      // Process checkout
      let totalDeducted = 0;
      const purchases = [];
      
      for (const item of cartData.items) {
        const category = SHOP_CATEGORIES[item.categoryKey];
        const shopItem = category?.items.find(i => i.id === item.itemId);
        if (shopItem) {
          let itemPrice = shopItem.price * item.quantity;
          const originalPrice = itemPrice;
          
          if (cartData.discount > 0 && cartData.total > 0) {
            const discountRatio = cartData.discount / cartData.total;
            const itemDiscount = Math.floor(originalPrice * discountRatio);
            itemPrice = originalPrice - itemDiscount;
          }
          
          for (let i = 0; i < item.quantity; i++) {
            const singlePrice = Math.floor(itemPrice / item.quantity);
            await recordPurchase(
              userId,
              interaction.user.tag,
              item.itemId,
              shopItem.amount,
              singlePrice,
              item.categoryKey,
              cartData.coupon ? cartData.coupon.code : null,
              shopItem.price
            );
            totalDeducted += singlePrice;
          }
          
          purchases.push({
            name: shopItem.name,
            amount: shopItem.amount * item.quantity,
            price: itemPrice
          });
        }
      }
      
      user.coins -= totalDeducted;
      user.username = interaction.user.tag;
      await user.save();
      await clearCart(userId);
      
      const purchaseSummary = purchases.map((p, i) =>
        `**${i + 1}.** ${p.name} x${p.amount} — ${p.price} coins`
      ).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Purchase Complete!')
        .setColor(0x57f287)
        .setDescription([
          `You successfully completed your purchase! 🎉`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          purchaseSummary,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `💰 **Total:** ${totalDeducted} coins`,
          cartData.coupon ? `🎫 **Coupon Used:** \`${cartData.coupon.code}\` (${cartData.discount} coins saved!)` : '',
          `💳 **New Balance:** ${user.coins} coins`,
          '',
          '📋 **Staff have been notified** to fulfill your order.',
          'Please wait for a staff member to deliver your items.',
        ].filter(Boolean).join('\n'))
        .setFooter({ text: `Order • ${new Date().toLocaleString()}` })
        .setTimestamp();
      
      const backButton = buildBackButton();
      await interaction.reply({ embeds: [embed], components: [backButton], ephemeral: true });
      
      // Notify staff
      try {
        const logChannel = await client.channels.fetch(STAFF_LOG_CHANNEL);
        const logEmbed = new EmbedBuilder()
          .setTitle('🪙 Shop Purchase (Cart Checkout)')
          .setColor(0xf0b429)
          .setDescription(`**${interaction.user.tag}** made a bulk purchase!`)
          .addFields(
            { name: '📦 Items', value: purchases.map(p => `${p.name} x${p.amount}`).join('\n'), inline: false },
            { name: '💰 Total', value: `${totalDeducted} coins`, inline: true },
            { name: '💳 New Balance', value: `${user.coins} coins`, inline: true },
            { name: '🎫 Coupon', value: cartData.coupon ? `${cartData.coupon.code} (${cartData.discount} coins off)` : 'None', inline: true },
          )
          .setFooter({ text: `User ID: ${userId}` })
          .setTimestamp();
        
        const staffPing = MOD_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
        await logChannel.send({
          content: `📦 **New Bulk Shop Order!** ${staffPing}\n<@${userId}> purchased ${purchases.length} item types for **${totalDeducted}** coins.`,
          embeds: [logEmbed],
        });
      } catch (err) { console.error('Could not send shop log:', err); }
      
      try {
        await interaction.user.send({
          content: [
            `✅ **Purchase Confirmed!**`,
            '',
            `You completed a bulk purchase from the Golden Coins Shop!`,
            `💰 **Total Spent:** ${totalDeducted} coins`,
            `💳 **New Balance:** ${user.coins} coins`,
            cartData.coupon ? `🎫 **Coupon Used:** ${cartData.coupon.code} (${cartData.discount} coins saved!)` : '',
            '',
            `📦 **Items Purchased:**`,
            ...purchases.map(p => `• ${p.name} x${p.amount}`),
            '',
            `📋 **Order Status:** Pending fulfillment by staff`,
            `⏰ **Time:** ${new Date().toLocaleString()}`,
          ].join('\n')
        });
      } catch (err) { console.log('Could not send DM to user:', err); }
      return;
    }

    // ── SHOP COMPLETED BUTTON ──
    if (interaction.customId.startsWith('shop_completed:')) {
      const parts = interaction.customId.split(':');
      const purchaseId = parts[1];
      
      const hasPermission = interaction.user.id === SERVER_OWNER_ID || 
                            interaction.user.id === SHOP_COMPLETED_USER_ID;
      
      if (!hasPermission) {
        return interaction.reply({ content: '❌ You do not have permission to mark orders as completed.', ephemeral: true });
      }
      
      const success = await updatePurchaseStatus(purchaseId, true);
      
      if (!success) {
        return interaction.reply({ content: '❌ Could not find this purchase order.', ephemeral: true });
      }
      
      const oldEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0x57f287)
        .setDescription(
          oldEmbed.description.replace('📦 **Status:** ⏳ Pending', '📦 **Status:** ✅ **Completed!**')
        )
        .setFooter({ text: `✅ Completed by ${interaction.user.tag} • ${new Date().toLocaleString()}` });
      
      const disabledButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('shop_completed_disabled')
          .setLabel('✅ Completed ✓')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );
      const backButton = buildBackButton();
      
      await interaction.update({
        embeds: [updatedEmbed],
        components: [disabledButton, backButton],
      });
      
      try {
        const logChannel = await client.channels.fetch(STAFF_LOG_CHANNEL);
        const logEmbed = new EmbedBuilder()
          .setTitle('✅ Shop Order Completed')
          .setColor(0x57f287)
          .setDescription(`Order has been marked as **COMPLETED**!`)
          .addFields(
            { name: '✅ Completed By', value: `<@${interaction.user.id}>`, inline: true },
            { name: '📦 Status', value: '✅ Completed', inline: true }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      } catch (err) { console.error('Could not send completion log:', err); }
      
      return;
    }

    // ── SHOP BACK BUTTON ──
    if (interaction.customId === 'shop_back') {
      const embed = buildShopEmbed();
      const selectRow = buildCategorySelectMenu();
      const cartRow = buildCartButtons();
      await interaction.update({ embeds: [embed], components: [selectRow, cartRow] });
      return;
    }

    // ── VERIFY BUTTON ──
    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        return interaction.reply({ content: '✅ You are now verified! Welcome to GoldenHeart SMP! 🎉', ephemeral: true });
      } catch {
        return interaction.reply({ content: '❌ Failed to verify. Please contact a staff member.', ephemeral: true });
      }
    }

    // ── TICKET CLAIM ──
    if (interaction.customId.startsWith('ticket_claim:')) {
      const channelId = interaction.customId.split(':')[1];
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ Only staff can claim tickets.', ephemeral: true });
      
      const ticket = await Ticket.findOne({ channelId });
      if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      if (ticket.claimedBy)
        return interaction.reply({ content: `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
      
      await claimTicket(channelId, interaction.user.id);
      const claimEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ **<@${interaction.user.id}>** has claimed this ticket and will be assisting you.`)
        .setTimestamp();
      await interaction.channel.send({ embeds: [claimEmbed] });
      return interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
    }

    // ── TICKET CLOSE ──
    if (interaction.customId.startsWith('ticket_close:')) {
      const channelId = interaction.customId.split(':')[1];
      const ticket = await Ticket.findOne({ channelId });
      if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      if (!hasModPermission(interaction.member) && interaction.user.id !== ticket.userId)
        return interaction.reply({ content: '❌ Only staff or the ticket owner can close this.', ephemeral: true });
      
      await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
      await closeTicket(channelId);
      
      try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m =>
          `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`
        ).join('\n');
        const logEmbed = new EmbedBuilder()
          .setTitle(`🎟️ Ticket Closed — #${interaction.channel.name}`).setColor(0xed4245)
          .addFields(
            { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Opened at', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: true },
          ).setTimestamp();
        const transcriptBuffer = Buffer.from(transcript, 'utf8');
        const attachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${interaction.channel.name}.txt` });
        const logCh = await client.channels.fetch(STAFF_LOG_CHANNEL);
        await logCh.send({ embeds: [logEmbed], files: [attachment] });
      } catch (err) { console.error('Transcript error:', err); }
      
      setTimeout(() => interaction.channel.delete().catch(() => { }), 5000);
    }

    // ── APPLICATION ACCEPT/REJECT ──
    if (interaction.customId.startsWith('app_accept:')) {
      const [, role, userId, appId] = interaction.customId.split(':');
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('_noop_accept').setLabel('✅ Accepted').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('_noop_reject').setLabel('❌ Reject').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      try {
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x3dd68c).setFooter({ text: `✅ Accepted by ${interaction.user.tag}` });
        await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
      } catch (err) { console.error('Could not update app message:', err); }
      
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(APP_ROLES[role]);
      } catch (err) { console.error('Could not assign role:', err); }
      
      try {
        const user = await client.users.fetch(userId);
        await user.send(`🎉 **Congratulations!**\n\nYour **${APP_NAMES[role]}** application (\`${appId}\`) has been **accepted**!\n\nYou've been given the role. Welcome to the team! 🏆\n\n*Reviewed by: ${interaction.user.tag}*`);
      } catch { }
      return interaction.editReply({ content: `✅ Application **${appId}** accepted.` });
    }

    if (interaction.customId.startsWith('app_reject:')) {
      const [, role, userId, appId] = interaction.customId.split(':');
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('_noop_accept').setLabel('✅ Accept').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('_noop_rejected').setLabel('❌ Rejected').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      try {
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0xe05c5c).setFooter({ text: `❌ Rejected by ${interaction.user.tag}` });
        await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
      } catch (err) { console.error('Could not update app message:', err); }
      
      try {
        const user = await client.users.fetch(userId);
        await user.send(`📋 **Application Update**\n\nYour **${APP_NAMES[role]}** application (\`${appId}\`) has been **rejected** at this time.\n\nDon't be discouraged — you're welcome to apply again in the future! 💪\n\n*Reviewed by: ${interaction.user.tag}*`);
      } catch { }
      return interaction.editReply({ content: `❌ Application **${appId}** rejected.` });
    }

    // ── BOOK NAVIGATION ──
    if (interaction.customId.startsWith('book_prev:') || interaction.customId.startsWith('book_next:')) {
      const [action, bookKey, pageRaw] = interaction.customId.split(':');
      let book = RULEBOOKS[bookKey];
      let currentPage = Number.parseInt(pageRaw, 10);
      
      if (!book || Number.isNaN(currentPage)) {
        const embedData = interaction.message.embeds?.[0];
        const text = `${embedData?.title || ''} ${embedData?.footer?.text || ''}`;
        let foundKey = 'mc';
        if (text.includes('Chat Rules')) foundKey = 'chat';
        else if (text.includes('General Rules')) foundKey = 'general';
        book = RULEBOOKS[foundKey];
        const pageMatch = (embedData?.footer?.text || '').match(/Page (\d+) of/i);
        currentPage = pageMatch ? Number.parseInt(pageMatch[1], 10) - 1 : 0;
      }
      
      if (Number.isNaN(currentPage) || !book) {
        return interaction.reply({ content: '❌ This book has expired. Please repost the rulebook.', ephemeral: true });
      }
      
      const direction = interaction.customId.startsWith('book_prev:') ? -1 : 1;
      const newPage = Math.max(0, Math.min(book.pages.length - 1, currentPage + direction));
      if (newPage === currentPage) return interaction.deferUpdate();
      
      const embed = buildBookEmbed(book.title, book.pages, newPage, book.color);
      const row = buildBookRow(newPage, book.pages.length, bookKey);
      return interaction.update({ embeds: [embed], components: [row] });
    }

    // ── SUGGESTION ACCEPT/REJECT ──
    if (interaction.customId.startsWith('suggest_accept:') || interaction.customId.startsWith('suggest_reject:')) {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ Only staff can accept or reject suggestions.', ephemeral: true });
      
      const [, suggId] = interaction.customId.split(':');
      const isAccept = interaction.customId.startsWith('suggest_accept:');
      const newStatus = isAccept ? 'accepted' : 'rejected';
      const statusEmoji = isAccept ? '✅' : '❌';
      const statusColor = isAccept ? 0x57f287 : 0xed4245;
      
      const suggestion = await updateSuggestionStatus(suggId, newStatus);
      if (!suggestion) return interaction.reply({ content: `❌ Suggestion \`${suggId}\` not found.`, ephemeral: true });
      
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      embed.setColor(statusColor);
      embed.spliceFields(2, 1, {
        name: '📌 Status',
        value: `${statusEmoji} **${newStatus.toUpperCase()}** by <@${interaction.user.id}>`,
        inline: true
      });
      embed.setFooter({ text: `Processed by ${interaction.user.tag}` });
      
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`suggest_accept:${suggId}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId(`suggest_reject:${suggId}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      
      await interaction.message.edit({ embeds: [embed], components: [disabledRow] });
      
      try {
        const user = await client.users.fetch(suggestion.fromUserId);
        await user.send(`📋 **Suggestion Update**\n\nYour suggestion **"${suggestion.text.slice(0, 100)}${suggestion.text.length > 100 ? '...' : ''}"** has been **${newStatus.toUpperCase()}** by <@${interaction.user.id}>.\n\n🆔 Suggestion ID: \`${suggId}\``);
      } catch { }
      
      return interaction.reply({ content: `${statusEmoji} Suggestion \`${suggId}\` has been **${newStatus}**!`, ephemeral: true });
    }

    // ── ROLE TOGGLE ──
    if (interaction.customId.startsWith('role_toggle:')) {
      const roleId = interaction.customId.split(':')[1];
      const member = interaction.member;
      try {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          return interaction.reply({ content: `✅ Removed the role.`, ephemeral: true });
        } else {
          await member.roles.add(roleId);
          return interaction.reply({ content: `✅ Added the role!`, ephemeral: true });
        }
      } catch {
        return interaction.reply({ content: '❌ Failed to toggle role. Check bot permissions.', ephemeral: true });
      }
    }

    // ─── REACTION ROLES BUTTONS ───
    if (
      interaction.customId === 'rr_open_menu' || 
      interaction.customId.startsWith('rr_btn_') || 
      interaction.customId === 'rr_colors'
    ) {
      await handleRRInteraction(interaction);
      return;
    }

    // ─── CASINO BUTTONS ───
    if (
      interaction.customId.startsWith('mines_click') || 
      interaction.customId.startsWith('mines_cashout')
    ) {
      await handleCasinoInteraction(interaction);
      return;
    }
  }
}  // <-- THIS CLOSES THE ENTIRE interactionCreate HANDLER

// ─────────────────────────────────────────
// SLASH COMMAND REGISTRATION
// ─────────────────────────────────────────
const staffChoices = Object.entries(STAFF_MEMBERS).map(([key, info]) => ({ name: `${info.label} (${info.type})`, value: key }));
const categoryChoices = Object.keys(SHOP_CATEGORIES).map(key => {
  const category = SHOP_CATEGORIES[key];
  return { name: `${category.emoji} ${category.name}`, value: key };
});

const commandsList = [
  // Core commands
  new SlashCommandBuilder().setName('features').setDescription('See all features available to members'),
  new SlashCommandBuilder().setName('rules').setDescription('View the full server rules and warning system'),
  new SlashCommandBuilder().setName('rulebook_mc').setDescription('📖 Browse the Minecraft Server Rules (paginated book)'),
  new SlashCommandBuilder().setName('rulebook_chat').setDescription('📖 Browse the Chat Rules (paginated book)'),
  new SlashCommandBuilder().setName('rulebook_general').setDescription('📖 Browse the General Rules, Warning System & Staff Rules (paginated book)'),
  new SlashCommandBuilder().setName('applypanel').setDescription('Send the staff application dropdown panel'),
  new SlashCommandBuilder().setName('verifypanel').setDescription('Send verification panel'),
  new SlashCommandBuilder().setName('announce').setDescription('Send announcement').addStringOption(o => o.setName('title').setDescription('Optional title').setRequired(false)),
  
  // Tracking commands
  new SlashCommandBuilder().setName('voicestats').setDescription('View your voice chat stats'),
  new SlashCommandBuilder().setName('invitestats').setDescription('View your invite stats'),
  new SlashCommandBuilder().setName('voiceleaderboard').setDescription('View the voice chat leaderboard'),
  new SlashCommandBuilder().setName('inviteleaderboard').setDescription('View the invite leaderboard'),
  
  // Shop commands
  new SlashCommandBuilder().setName('shop').setDescription('🪙 Open the Golden Coins Shop'),
  new SlashCommandBuilder().setName('cart').setDescription('View your shopping cart'),
  new SlashCommandBuilder().setName('shop_balance').setDescription('💰 Check your Golden Coins balance and purchase history')
    .addUserOption(o => o.setName('user').setDescription('User to check (default: yourself)').setRequired(false)),
  new SlashCommandBuilder().setName('shop_purchases').setDescription('📋 View your purchase history')
    .addUserOption(o => o.setName('user').setDescription('User to check (default: yourself)').setRequired(false)),
  new SlashCommandBuilder().setName('shoppanel').setDescription('🛒 Post the Golden Coins Shop panel (admin only)'),
  new SlashCommandBuilder().setName('shop_editprice').setDescription('Edit the price of a shop item (Owner only)')
    .addStringOption(o => o.setName('category').setDescription('Category of the item').setRequired(true).addChoices(...categoryChoices))
    .addStringOption(o => o.setName('item').setDescription('Item ID to edit').setRequired(true)),
  new SlashCommandBuilder().setName('shop_listitems').setDescription('List all shop items with their IDs and prices (Owner only)'),
  
  // Coupon commands
  new SlashCommandBuilder().setName('create_coupon').setDescription('Create a new coupon code (Owner only)'),
  new SlashCommandBuilder().setName('list_coupons').setDescription('List all coupons (Owner only)'),
  
  // Coin commands
  new SlashCommandBuilder().setName('balance').setDescription('Check your Golden Coins balance (or another member\'s)')
    .addUserOption(o => o.setName('user').setDescription('Member to check (default: yourself)').setRequired(false)),
  new SlashCommandBuilder().setName('coinslb').setDescription('View the top 10 richest members by Golden Coins'),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily 50 Golden Coins reward!'),
  new SlashCommandBuilder().setName('transfer').setDescription('Transfer Golden Coins to another member')
    .addUserOption(o => o.setName('user').setDescription('Member to transfer coins to').setRequired(true))
    .addNumberOption(o => o.setName('amount').setDescription('Amount of coins to transfer').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('setbalance').setDescription('Set a user\'s coin balance (admin only)')
    .addUserOption(o => o.setName('user').setDescription('User to set balance for').setRequired(true))
    .addNumberOption(o => o.setName('amount').setDescription('New balance amount (0 or greater)').setRequired(true).setMinValue(0))
    .addStringOption(o => o.setName('reason').setDescription('Reason for balance change').setRequired(false)),
  
  // XP commands
  new SlashCommandBuilder().setName('rank').setDescription('Check your XP rank (or another member\'s)')
    .addUserOption(o => o.setName('user').setDescription('Member to check (default: yourself)').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View the top 10 most active members by XP'),
  
  // Feedback commands
  new SlashCommandBuilder().setName('feedback').setDescription('Rate a staff member — you\'ll receive a DM with the full staff list!'),
  new SlashCommandBuilder().setName('viewfeedback').setDescription('View feedback for staff members (mod only)')
    .addStringOption(o => o.setName('staff').setDescription('Specific staff member (leave blank for all)').setRequired(false).addChoices(...staffChoices)),
  new SlashCommandBuilder().setName('staffstats').setDescription('View full staff performance table (mod only)'),
  
  // Suggestion commands
  new SlashCommandBuilder().setName('suggest').setDescription('Submit a suggestion for the server')
    .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true)),
  new SlashCommandBuilder().setName('viewsuggestions').setDescription('View all suggestions (mod only)')
    .addStringOption(o => o.setName('status').setDescription('Filter by status').setRequired(false)
      .addChoices(
        { name: 'All', value: 'all' },
        { name: 'Pending', value: 'pending' },
        { name: 'Accepted', value: 'accepted' },
        { name: 'Rejected', value: 'rejected' },
      )),
  // Welcome Manager Configuration Commands
...welcomeCommandsData,
  // Staff Manager Commands
...staffCommandsData,
  // ─── CASINO SYSTEM ROUTER ───
...casinoCommandsData,
  // ... role commands ...
...rrCommandsData,
    // ... ai commands ...
...aiChatCommandsData,   // ← ADD THIS LINE
  // Warn commands
  new SlashCommandBuilder().setName('warn').setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('unwarn').setDescription('Remove latest warn from a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  new SlashCommandBuilder().setName('warnings').setDescription('Check warns for a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  new SlashCommandBuilder().setName('clearwarns').setDescription('Clear ALL warns for a member (admin only)')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  
  // Moderation commands
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member permanently or temporarily')
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1d, 7d, 2h (leave blank for permanent)').setRequired(false)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('purge').setDescription('Bulk-delete messages (1–100)')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete').setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName('lock').setDescription('Lock a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (default: current)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (default: current)').setRequired(false)),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode in a channel')
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(o => o.setName('channel').setDescription('Channel (default: current)').setRequired(false)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Show server stats and warn records'),
  
  // Poll and giveaway
  new SlashCommandBuilder().setName('poll').setDescription('Create a poll (mod only)')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option_a').setDescription('Option A').setRequired(true))
    .addStringOption(o => o.setName('option_b').setDescription('Option B').setRequired(true))
    .addStringOption(o => o.setName('option_c').setDescription('Option C').setRequired(false))
    .addStringOption(o => o.setName('option_d').setDescription('Option D').setRequired(false))
    .addIntegerOption(o => o.setName('duration').setDescription('Hours (default: 24)').setRequired(false).setMinValue(0).setMaxValue(168))
    .addIntegerOption(o => o.setName('minutes').setDescription('Extra minutes').setRequired(false).setMinValue(1).setMaxValue(59)),
  new SlashCommandBuilder().setName('giveaway').setDescription('Giveaway management')
    .addSubcommand(sub => sub.setName('start').setDescription('Start a new giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 30m, 2d').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default: 1)').setRequired(false).setMinValue(1).setMaxValue(10))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (default: current)').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('reroll').setDescription('Reroll a giveaway winner')
      .addStringOption(o => o.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
    ),
  
  // Misc commands
  new SlashCommandBuilder().setName('ticketpanel').setDescription('Post the support ticket panel (admin only)'),
  new SlashCommandBuilder().setName('serverstatus').setDescription('Check if the GoldenHeart SMP Minecraft server is online'),
  new SlashCommandBuilder().setName('mcplayer').setDescription('Look up a Minecraft player by username')
    .addStringOption(o => o.setName('username').setDescription('Minecraft username').setRequired(true)),
  new SlashCommandBuilder().setName('embed').setDescription('Post a custom embed (admin only)')
    .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(false))
    .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #ff0000 (default: gold)').setRequired(false))
    .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('Image URL').setRequired(false))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (default: current)').setRequired(false)),
  new SlashCommandBuilder().setName('remindme').setDescription('Set a personal reminder via DM')
    .addStringOption(o => o.setName('time').setDescription('When e.g. 30m, 2h, 1d').setRequired(true))
    .addStringOption(o => o.setName('reminder').setDescription('What to remind you of').setRequired(true)),
  new SlashCommandBuilder().setName('afk').setDescription('Set yourself as AFK')
    .addStringOption(o => o.setName('reason').setDescription('AFK reason (default: AFK)').setRequired(false)),
  new SlashCommandBuilder().setName('birthday').setDescription('Birthday system')
    .addSubcommand(sub => sub.setName('set').setDescription('Set your birthday')
      .addIntegerOption(o => o.setName('day').setDescription('Day (1–31)').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption(o => o.setName('month').setDescription('Month (1–12)').setRequired(true).setMinValue(1).setMaxValue(12))
    )
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove your birthday'))
    .addSubcommand(sub => sub.setName('view').setDescription('View someone\'s birthday')
      .addUserOption(o => o.setName('user').setDescription('User to check (default: yourself)').setRequired(false))
    ),
  new SlashCommandBuilder().setName('rolepanel').setDescription('Post a self-role button panel (admin only)')
    .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
    .addStringOption(o => o.setName('label1').setDescription('Button label for role 1').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Panel title').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('Panel description').setRequired(false))
    .addRoleOption(o => o.setName('role2').setDescription('Role 2').setRequired(false))
    .addStringOption(o => o.setName('label2').setDescription('Button label for role 2').setRequired(false))
    .addRoleOption(o => o.setName('role3').setDescription('Role 3').setRequired(false))
    .addStringOption(o => o.setName('label3').setDescription('Button label for role 3').setRequired(false))
    .addRoleOption(o => o.setName('role4').setDescription('Role 4').setRequired(false))
    .addStringOption(o => o.setName('label4').setDescription('Button label for role 4').setRequired(false))
    .addRoleOption(o => o.setName('role5').setDescription('Role 5').setRequired(false))
    .addStringOption(o => o.setName('label5').setDescription('Button label for role 5').setRequired(false)),
  new SlashCommandBuilder().setName('testwelcomemessage').setDescription('Test the welcome message for a specific user (admin only)')
    .addUserOption(o => o.setName('user').setDescription('User to test the welcome message for (default: yourself)').setRequired(false)),
  new SlashCommandBuilder().setName('exportleaderboard').setDescription('Export XP and Coins leaderboard data to staff logs (admin only)'),
  new SlashCommandBuilder().setName('editmessage').setDescription('✏️ Edit a bot message (Owner only)')
    .addStringOption(o => o.setName('channel_id').setDescription('Channel ID where the message is').setRequired(true))
    .addStringOption(o => o.setName('message_id').setDescription('Message ID to edit').setRequired(true)),
  new SlashCommandBuilder().setName('editembed').setDescription('✏️ Edit a bot embed (Owner only)')
    .addStringOption(o => o.setName('channel_id').setDescription('Channel ID where the embed is').setRequired(true))
    .addStringOption(o => o.setName('message_id').setDescription('Message ID to edit').setRequired(true)),
  new SlashCommandBuilder().setName('editrules').setDescription('✏️ Edit a rulebook page (Owner only)')
    .addStringOption(o => o.setName('book').setDescription('Which rulebook to edit').setRequired(true)
      .addChoices(
        { name: '⚔️ Minecraft Rules', value: 'mc' },
        { name: '💬 Chat Rules', value: 'chat' },
        { name: '📜 General Rules', value: 'general' },
      )
    )
    .addIntegerOption(o => o.setName('page').setDescription('Page number to edit (e.g. 1, 2, 3)').setRequired(true).setMinValue(1).setMaxValue(10)),
  new SlashCommandBuilder().setName('import_data').setDescription('Import coins or XP data from a JSON file (Owner only)')
    .addAttachmentOption(o => o.setName('file').setDescription('JSON file to import').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Data type to import').setRequired(true)
      .addChoices(
        { name: 'Coins Data', value: 'coins' },
        { name: 'XP Data', value: 'xp' }
      )),
  new SlashCommandBuilder().setName('export_data').setDescription('Export coins or XP data to a JSON file (Owner only)')
    .addStringOption(o => o.setName('type').setDescription('Data type to export').setRequired(true)
      .addChoices(
        { name: 'Coins Data', value: 'coins' },
        { name: 'XP Data', value: 'xp' }
      )),
];  // <-- THIS CLOSES THE commandsList ARRAY

const rest = new REST({ version: '10' }).setToken(TOKEN);

// Register commands
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('Global commands cleared');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commandsList.map(c => c.toJSON()) });
    console.log('✅ Slash commands registered (guild)');
    console.log('✅ All commands registered successfully!');
    console.log('✅ Total commands: ' + commandsList.length);
  } catch (err) {
    console.error('❌ FAILED TO REGISTER SLASH COMMANDS:', err);
  }
})();

// ─────────────────────────────────────────
// LOGIN - MUST BE LAST!
// ─────────────────────────────────────────
client.login(TOKEN).catch(err => console.error('❌ FAILED TO LOG IN TO DISCORD:', err));

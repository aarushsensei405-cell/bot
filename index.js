const express = require('express');
const {
  Client,
  ActivityType,
  GatewayIntentBits,
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
  PermissionOverwrites,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http  = require('http');

// ─────────────────────────────────────────
// EXPRESS (keep-alive for Render)
// ─────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const TOKEN     = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID  = '1432272831722553398';

const STAFF_LOG_CHANNEL       = '1432277470878498866';
const SUGGESTIONS_CHANNEL_ID  = '1515769765514313819';
const WELCOME_CHANNEL_ID      = '1516255117060341790';
const STARBOARD_CHANNEL_ID    = '1432277447440597028';
const BIRTHDAY_CHANNEL_ID     = '1432277447440597028';
const TICKET_CATEGORY_ID      = '1432272831722553398';
const LEVEL_UP_CHANNEL_ID     = '1432277463366504484';

const VERIFY_ROLE_ID   = '1432277416109281371';
const BIRTHDAY_ROLE_ID = '1432277416109281371';

// ── Spam / flood protection settings ──
const SPAM_SETTINGS = {
  duplicateMessageLimit: 4,
  duplicateWindowMs:     10000,
  rapidMessageLimit:     10,
  rapidWindowMs:         5000,
  linkSpamLimit:         3,
  timeoutMinutes:        10,
};
const MOD_ROLE_IDS = ['1432277404864483390', '1432277404046331984'];

// Named staff members for feedback
const STAFF_MEMBERS = {
  gray:      { id: '935050795299250197',  label: 'Gray',       type: 'Chat Moderator' },
  mayehm:    { id: '750704207434088489',  label: 'Mayehm',     type: 'Helper' },
  iceflows:  { id: '1394287232029954108', label: 'IceFlows',   type: 'Helper' },
  mncikdb:   { id: '1092762008371339365', label: 'MNCIKDB',    type: 'MC Chat Moderator' },
  viking2001:{ id: '1215370954709008385', label: 'Viking2001',  type: 'MC Chat Moderator' },
};

const APP_ROLES = {
  chatmod: '1433055763051446272',
  helper:  '1432277404864483390',
  mcmod:   '1432278296347021352',
};
const APP_NAMES = {
  chatmod: 'Chat Moderator',
  helper:  'Helper',
  mcmod:   'Minecraft Chat Moderator',
};

const STARBOARD_THRESHOLD = 3;

// ─────────────────────────────────────────
// FILE STORAGE HELPERS
// ─────────────────────────────────────────
const WARNS_FILE       = path.join(__dirname, 'warns.json');
const FEEDBACK_FILE    = path.join(__dirname, 'feedback.json');
const SUGGESTIONS_FILE = path.join(__dirname, 'suggestions.json');
const XP_FILE          = path.join(__dirname, 'xp.json');
const BANS_FILE        = path.join(__dirname, 'tempbans.json');
const BIRTHDAYS_FILE   = path.join(__dirname, 'birthdays.json');
const STARBOARD_FILE   = path.join(__dirname, 'starboard.json');
const TICKETS_FILE     = path.join(__dirname, 'tickets.json');
const AFK_FILE         = path.join(__dirname, 'afk.json');
const GIVEAWAYS_FILE   = path.join(__dirname, 'giveaways.json');
const REMINDERS_FILE   = path.join(__dirname, 'reminders.json');

const APP_FILES = {
  chatmod: path.join(__dirname, 'applicationforchatmod.json'),
  helper:  path.join(__dirname, 'applicationforhelper.json'),
  mcmod:   path.join(__dirname, 'applicationforminecraftchatmod.json'),
};

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadWarns()           { return readJSON(WARNS_FILE, {}); }
function saveWarns(d)          { writeJSON(WARNS_FILE, d); }
function loadFeedback()        { return readJSON(FEEDBACK_FILE, {}); }
function saveFeedback(d)       { writeJSON(FEEDBACK_FILE, d); }
function loadSuggestions()     { return readJSON(SUGGESTIONS_FILE, []); }
function saveSuggestion(entry) {
  const list = loadSuggestions();
  list.push(entry);
  writeJSON(SUGGESTIONS_FILE, list);
}
function loadApps(role)        { return readJSON(APP_FILES[role], []); }
function saveApp(role, entry)  {
  const apps = loadApps(role);
  apps.push(entry);
  writeJSON(APP_FILES[role], apps);
}
function loadXP()              { return readJSON(XP_FILE, {}); }
function saveXP(d)             { writeJSON(XP_FILE, d); }
function loadTempBans()        { return readJSON(BANS_FILE, []); }
function saveTempBans(d)       { writeJSON(BANS_FILE, d); }
function loadBirthdays()       { return readJSON(BIRTHDAYS_FILE, {}); }
function saveBirthdays(d)      { writeJSON(BIRTHDAYS_FILE, d); }
function loadStarboard()       { return readJSON(STARBOARD_FILE, {}); }
function saveStarboard(d)      { writeJSON(STARBOARD_FILE, d); }
function loadTickets()         { return readJSON(TICKETS_FILE, {}); }
function saveTickets(d)        { writeJSON(TICKETS_FILE, d); }
function loadAFK()             { return readJSON(AFK_FILE, {}); }
function saveAFK(d)            { writeJSON(AFK_FILE, d); }
function loadGiveaways()       { return readJSON(GIVEAWAYS_FILE, []); }
function saveGiveaways(d)      { writeJSON(GIVEAWAYS_FILE, d); }
function loadReminders()       { return readJSON(REMINDERS_FILE, []); }
function saveReminders(d)      { writeJSON(REMINDERS_FILE, d); }

const activeSessions  = new Map();
const pendingFeedback = new Map();
const pollVotes       = new Map();
const messageHistory  = new Map();
const spamCooldown    = new Map();
const xpCooldown      = new Map();
let afkData           = loadAFK();

const STAR_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

// ─────────────────────────────────────────
// BOOK / PAGINATED EMBED SYSTEM
// ─────────────────────────────────────────

// In-memory store: messageId → { pages, currentPage, bookTitle, color }
const activeBooks = new Map();

function buildBookEmbed(bookTitle, pages, pageIndex, color) {
  const page = pages[pageIndex];
  return new EmbedBuilder()
    .setTitle(page.title)
    .setDescription(page.content)
    .setColor(color)
    .setFooter({ text: `📖 ${bookTitle}  •  Page ${pageIndex + 1} of ${pages.length}` })
    .setTimestamp();
}

function buildBookRow(pageIndex, totalPages, bookId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`book_prev:${bookId}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId(`book_page:${bookId}`)
      .setLabel(`${pageIndex + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`book_next:${bookId}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === totalPages - 1),
  );
}

// ── The 3 pre-built rulebooks ──

const RULEBOOK_MC = {
  title: '⚔️ GoldenHeart SMP — Minecraft Rules',
  color: 0x57f287, // green
  pages: [
    {
      title: '🌍 Page 1 — Spawn Rules',
      content: [
        '> By playing on GoldenHeart SMP, you agree to follow all rules. Attempting to bypass, exploit, or abuse loopholes is punishable.\n',
        '**1.1 No Spawn Killing**',
        'Killing, trapping, baiting, crystaling, lava trapping, TNT trapping, or otherwise harming players at or near spawn is prohibited. Staff-approved events are the only exception.\n',
        '**1.2 No Spawn Griefing**',
        'Do not destroy, alter, steal from, or place blocks at spawn. If spawn protection fails, it is still against the rules. Report issues to staff immediately.\n',
        '**1.3 No Spawn Camping**',
        'Repeatedly waiting at spawn to kill, follow, or target players is prohibited.\n',
        '**1.4 No Spawn Traps**',
        'Any trap designed to kill, damage, trap, or inconvenience players near spawn is prohibited.\n',
        '**1.5 No Claim Blocking**',
        'Do not intentionally build around spawn in a way that limits expansion, movement, or future server projects.',
      ].join('\n'),
    },
    {
      title: '⚔️ Page 2 — PvP & Combat Rules',
      content: [
        '**2.1 No Combat Logging**',
        'Logging out during PvP is prohibited. Switching accounts, disconnecting, crashing your client, or using any method to avoid death counts as combat logging.\n🔴 **Punishment:** 1 Day Ban. Inventory may be removed or awarded to the opponent.\n',
        '**2.2 No /Back Abuse**',
        '/back may not be used to escape combat or instantly return to a fight after dying.\n',
        '**2.3 No Bed Trap Logging**',
        'Logging out while trapped or surrounded in combat is considered combat logging.\n',
        '**2.4 No Alt Combat Abuse**',
        'Using alternate accounts to gain combat advantages is prohibited.\n',
        '**2.5 No Kill Farming**',
        'Farming kills, stats, bounties, or rewards using teammates, friends, or alts is prohibited.\n',
        '**2.6 No Exploit PvP**',
        'Any bug, glitch, or unintended mechanic used to gain a combat advantage is prohibited.\n',
        '**2.7 No Safezone Abuse**',
        'Do not repeatedly enter protected areas or spawn to avoid combat.',
      ].join('\n'),
    },
    {
      title: '🏰 Page 3 — Raiding & Griefing',
      content: [
        '**3.1 Raiding Is Allowed** ✅',
        'Bases may be raided unless otherwise stated by staff.\n',
        '**3.2 Griefing Is Allowed** ✅',
        'Base destruction is allowed as part of raiding.\n',
        '**3.3 No Server-Damaging Grief**',
        'Excessive lag-causing destruction, world corruption attempts, or actions intended to harm server performance are prohibited.\n',
        '**3.4 No Exploit Raiding**',
        'Raiding through glitches, bugs, duplication, chunk exploits, or unintended mechanics is prohibited.\n',
        '**3.5 No Offline Abuse Exploits**',
        'Intentionally abusing plugin bugs or protection failures against offline players is prohibited.',
      ].join('\n'),
    },
    {
      title: '👥 Page 4 — Team Rules',
      content: [
        '**4.1 Maximum Team Size: 6 Players**\n',
        '**4.2 Hidden Teaming Allowed** ✅',
        'Secret alliances, temporary alliances, diplomacy, and betrayals are all allowed.\n',
        '**4.3 No Team Limit Bypass**',
        'Splitting into multiple teams while operating as one large group is prohibited.\n',
        '**4.4 No Mass Alliances**',
        'Multiple teams cannot permanently cooperate to bypass the team limit.\n',
        '**4.5 No Alt Teams**',
        'Alternate accounts count toward team size limits.\n',
        '**4.6 Staff May Investigate Teaming**',
        'Shared bases, shared storage, coordinated attacks, voice communication, and resource sharing may all be used as evidence.',
      ].join('\n'),
    },
    {
      title: '🚫 Page 5 — Cheating & Exploits',
      content: [
        '**5.1 No Cheats** — Including but not limited to:',
        '> X-Ray • ESP • Tracers • Kill Aura • Reach • Auto Crystal • Auto Totem • Fly Hacks • Speed Hacks • NoSlow • Anti-Knockback • Triggerbot • Aim Assist • Macros • Scripts • Autoclickers • Modified clients\n',
        '**5.2 No Exploits:**',
        '> Dupes • Chunk exploits • Plugin bugs • Server bugs • Client exploits • Glitches • Packet abuse • Any unintended mechanic\n',
        '**5.3 Report Bugs**',
        'Bugs must be reported immediately. Abuse of bugs is punishable even if not listed.\n',
        '**5.4 No Lag Machines**',
        'Any machine designed to create lag, crashes, TPS drops, or server instability is prohibited.\n',
        '**5.5 No Crash Attempts**',
        'Attempts to crash players, staff, Discord bots, or the server are prohibited.\n',
        '**5.6 No Ban Evasion**',
        'Joining on alternate accounts after punishment is prohibited.',
      ].join('\n'),
    },
  ],
};

const RULEBOOK_CHAT = {
  title: '💬 GoldenHeart SMP — Chat Rules',
  color: 0xf0b429, // gold
  pages: [
    {
      title: '💬 Page 1 — Spam, Swearing & Harassment',
      content: [
        '**6.1 No Spam**',
        '> No flooding chat • No excessive caps • No repeated messages • No meaningless spam\n',
        '**6.2 Swearing Policy**',
        'Casual swearing is allowed. Directed swearing is **NOT** allowed.\n',
        '✅ **Allowed:**',
        '> *"This boss fight is f\*\*\*ing hard."*\n> *"That was bad luck."*\n',
        '❌ **Not Allowed:**',
        '> *"You\'re f\*\*\*ing trash."*\n> *"Shut the f\*\*\* up."*\n',
        'Directed insults, harassment, and personal attacks are all prohibited.\n',
        '**6.3 No Harassment**',
        'Repeated targeting, bullying, stalking, or provoking players is prohibited.',
      ].join('\n'),
    },
    {
      title: '🚨 Page 2 — Hate Speech, Threats & NSFW',
      content: [
        '**6.4 No Hate Speech** 🚨 SEVERE',
        '> Racism • Nationality insults • Religious insults • Cultural insults • Ethnic discrimination\n',
        '🔴 **Result:** Immediate 1-Day Timeout minimum. Severe cases may skip directly to bans.\n',
        '**6.5 No Threats**',
        'Real-life threats are prohibited. Doxxing threats are prohibited.\n',
        '**6.6 No NSFW Content**',
        '> Sexual content • Pornography • Explicit media • Inappropriate usernames or skins\n',
        '**6.7 No Advertising**',
        'Advertising servers, communities, websites, or services without staff permission is prohibited.\n',
        '**6.8 No Impersonation**',
        'Pretending to be staff, content creators, or other players is prohibited.',
      ].join('\n'),
    },
  ],
};

const RULEBOOK_GENERAL = {
  title: '📜 GoldenHeart SMP — General Rules',
  color: 0xed4245, // red
  pages: [
    {
      title: '⚠️ Page 1 — Warning System',
      content: [
        '> Warnings are applied progressively. Staff may skip levels depending on severity.\n',
        '```',
        'Warn 1 → Verbal Warning / Minor Punishment',
        'Warn 2 → 30 Minute Timeout',
        'Warn 3 → 6 Hour Timeout',
        'Warn 4 → 1 Day Timeout',
        'Warn 5 → 3 Day Timeout',
        'Warn 6 → 7 Day Timeout (Final Warning)',
        'Warn 7 → Permanent Ban',
        '```',
      ].join('\n'),
    },
    {
      title: '👑 Page 2 — Staff Rules',
      content: [
        '**8.1 Respect Staff**',
        'You may disagree respectfully. Harassment of staff is prohibited.\n',
        '**8.2 No False Reports**',
        'Intentionally false reports may result in punishment.\n',
        '**8.3 Staff Decisions Are Final**',
        'Public arguments after a final decision may result in additional punishment.\n',
        '**8.4 Punishment Evasion**',
        'Using alts, VPNs, or other methods to avoid punishments is prohibited.',
      ].join('\n'),
    },
    {
      title: '⚖️ Page 3 — General Rules & Golden Rule',
      content: [
        '**9.1 Common Sense Rule**',
        'Not every possible offense can be listed. Staff may punish behavior that clearly harms the server or provides an unfair advantage.\n',
        '**9.2 No Loophole Abuse**',
        '"The rules didn\'t specifically say I couldn\'t" is not a valid defense. Attempting to bypass the intent of any rule is punishable.\n',
        '**9.3 No Real-Life Harm**',
        'Doxxing, leaking personal information, blackmail, or encouraging self-harm is strictly prohibited.\n',
        '**9.4 English Preferred**',
        'Staff must be able to moderate conversations when necessary.\n',
        '**9.5 Cooperation Required**',
        'Refusing staff investigations, evidence requests, or cheat checks may result in punishment.\n',
        '**9.6 The Golden Rule** ❤️',
        '> *Don\'t ruin the experience for other players.*\n\n*These rules are enforced based on both their wording and intended purpose. Play fair. Have fun. Win legitimately. — Golden Heart SMP Staff Team*',
      ].join('\n'),
    },
  ],
};

// ─────────────────────────────────────────
// XP / LEVELING CONFIG
// ─────────────────────────────────────────
const XP_PER_MESSAGE    = 15;
const XP_COOLDOWN_MS    = 60000;
const LEVEL_ROLES       = {};

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}
function getLevelFromXP(totalXP) {
  let level = 0;
  while (xpForLevel(level + 1) <= totalXP) level++;
  return level;
}

// ─────────────────────────────────────────
// APPLICATION QUESTIONS
// ─────────────────────────────────────────
const QUESTIONS = {
  chatmod: [
    { key: 'discord',  q: '**[1/6]** What is your Discord username?' },
    { key: 'age',      q: '**[2/6]** How old are you?' },
    { key: 'timezone', q: '**[3/6]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours',    q: '**[4/6]** How many hours per day can you be active?' },
    { key: 'why',      q: '**[5/6]** Why do you want to be a **Chat Moderator**? *(min 50 chars)*' },
    { key: 'scenario', q: '**[6/6]** A player is spamming slurs in chat. What do you do?' },
  ],
  helper: [
    { key: 'discord',    q: '**[1/6]** What is your Discord username?' },
    { key: 'age',        q: '**[2/6]** How old are you?' },
    { key: 'timezone',   q: '**[3/6]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours',      q: '**[4/6]** How many hours per day can you be active?' },
    { key: 'why',        q: '**[5/6]** Why do you want to be a **Helper**? *(min 50 chars)*' },
    { key: 'experience', q: '**[6/6]** Do you have any previous experience helping on servers?' },
  ],
  mcmod: [
    { key: 'discord',  q: '**[1/7]** What is your Discord username?' },
    { key: 'mcuser',   q: '**[2/7]** What is your Minecraft username?' },
    { key: 'age',      q: '**[3/7]** How old are you?' },
    { key: 'timezone', q: '**[4/7]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours',    q: '**[5/7]** How many hours per day can you be active on the MC server?' },
    { key: 'why',      q: '**[6/7]** Why do you want to be a **Minecraft Chat Moderator**? *(min 50 chars)*' },
    { key: 'scenario', q: '**[7/7]** A player is using a hack client and spamming chat. What do you do?' },
  ],
};

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
function autoDelete(sentMessage, ms = 10000) {
  if (!sentMessage) return;
  setTimeout(() => sentMessage.delete().catch(() => {}), ms);
}
function starsDisplay(n) {
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}
function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit  = match[2].toLowerCase();
  const map   = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return value * (map[unit] || 0);
}
function humanDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h`;
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

// ─────────────────────────────────────────
// SPAM / FLOOD DETECTION
// ─────────────────────────────────────────
function checkSpam(message) {
  const userId  = message.author.id;
  const now     = Date.now();
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
  const recentDup   = trimmed.filter(m => now - m.timestamp <= SPAM_SETTINGS.duplicateWindowMs);
  const sameContent = recentDup.filter(m => m.content === content && content.length > 0);
  if (sameContent.length >= SPAM_SETTINGS.duplicateMessageLimit) {
    return { type: 'duplicate_spam', detail: `Same message repeated ${sameContent.length} times within ${SPAM_SETTINGS.duplicateWindowMs / 1000}s`, matchedMessages: sameContent.map(m => m.message) };
  }
  return null;
}

// ─────────────────────────────────────────
// WELCOME CARD IMAGE GENERATOR
// ─────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
function circleClip(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}
async function generateWelcomeCard(member) {
  const width  = 900;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#2d1b4e');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
  accentGradient.addColorStop(0, '#f0b429');
  accentGradient.addColorStop(1, '#ffd76e');
  ctx.fillStyle = accentGradient;
  ctx.fillRect(0, 0, width, 8);
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#f0b429';
  ctx.beginPath(); ctx.arc(820, 60, 90, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(60, 280, 70, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  roundRect(ctx, 30, 30, width - 60, height - 60, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,180,41,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const avatarSize = 150;
  const avatarX    = 80;
  const avatarY    = height / 2 - avatarSize / 2;
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarImg = await loadImage(avatarURL);
    ctx.save();
    ctx.shadowColor = '#f0b429';
    ctx.shadowBlur  = 25;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f0b429';
    ctx.fill();
    ctx.restore();
    ctx.save();
    circleClip(ctx, avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2);
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#444';
    ctx.fill();
  }
  const textX = avatarX + avatarSize + 50;
  ctx.fillStyle = '#f0b429';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('WELCOME TO', textX, 110);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  let displayName = member.user.username;
  if (displayName.length > 18) displayName = displayName.slice(0, 16) + '…';
  ctx.fillText(displayName, textX, 160);
  ctx.fillStyle = '#cfcfe0';
  ctx.font = '24px sans-serif';
  ctx.fillText('GoldenHeart SMP', textX, 200);
  ctx.fillStyle = '#9d9db8';
  ctx.font = '20px sans-serif';
  ctx.fillText(`You are member #${member.guild.memberCount}`, textX, 240);
  return canvas.toBuffer('image/png');
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
// GIVEAWAY HELPERS
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
    const users    = await reaction.users.fetch();
    const eligible = users.filter(u => !u.bot).map(u => u);
    if (eligible.length === 0) {
      await channel.send(`🎉 Giveaway for **${giveaway.prize}** ended — no valid entries!`);
      return;
    }
    const winnerCount    = Math.min(giveaway.winners, eligible.length);
    const shuffled       = eligible.sort(() => Math.random() - 0.5).slice(0, winnerCount);
    const winnerMentions = shuffled.map(u => `<@${u.id}>`).join(', ');
    const endEmbed = EmbedBuilder.from(message.embeds[0])
      .setColor(0x57f287)
      .setTitle('🎉 GIVEAWAY ENDED')
      .setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winner${winnerCount > 1 ? 's' : ''}:** ${winnerMentions}\n\nCongratulations!`)
      .setFooter({ text: `Ended` })
      .setTimestamp();
    await message.edit({ embeds: [endEmbed], components: [] });
    await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
    const giveaways = loadGiveaways();
    const idx = giveaways.findIndex(g => g.messageId === giveaway.messageId);
    if (idx !== -1) {
      giveaways[idx].ended        = true;
      giveaways[idx].winners_list = shuffled.map(u => u.id);
      saveGiveaways(giveaways);
    }
  } catch (err) {
    console.error('Giveaway end error:', err);
  }
}

// ─────────────────────────────────────────
// ANTI-RAID TRACKING
// ─────────────────────────────────────────
const recentJoins    = [];
const RAID_THRESHOLD = 5;
const RAID_WINDOW_MS = 10000;
let   raidLockActive = false;

// ─────────────────────────────────────────
// BIRTHDAY CHECK
// ─────────────────────────────────────────
async function checkBirthdays(client) {
  const now        = new Date();
  const todayDay   = now.getUTCDate();
  const todayMonth = now.getUTCMonth() + 1;
  const birthdays  = loadBirthdays();
  const guild      = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  for (const [userId, data] of Object.entries(birthdays)) {
    if (data.day === todayDay && data.month === todayMonth) {
      if (data.lastAnnounced === `${todayMonth}-${todayDay}-${now.getUTCFullYear()}`) continue;
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        if (BIRTHDAY_ROLE_ID) {
          await member.roles.add(BIRTHDAY_ROLE_ID).catch(() => {});
          setTimeout(async () => { await member.roles.remove(BIRTHDAY_ROLE_ID).catch(() => {}); }, 86400000);
        }
        const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null);
        if (channel) {
          await channel.send(`🎂 **Happy Birthday, <@${userId}>!** 🎉\n\nWishing you an amazing day from everyone at **GoldenHeart SMP**! 🥳🎈`);
        }
        birthdays[userId].lastAnnounced = `${todayMonth}-${todayDay}-${now.getUTCFullYear()}`;
        saveBirthdays(birthdays);
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
  const reminders = loadReminders();
  const now       = Date.now();
  const remaining = [];
  for (const reminder of reminders) {
    if (now >= reminder.fireAt) {
      try {
        const user = await client.users.fetch(reminder.userId);
        await user.send(`⏰ **Reminder!**\n\n${reminder.text}`);
      } catch { /* user blocked DMs */ }
    } else {
      remaining.push(reminder);
    }
  }
  if (remaining.length !== reminders.length) saveReminders(remaining);
}

// ─────────────────────────────────────────
// TEMP BAN CHECK
// ─────────────────────────────────────────
async function checkTempBans(client) {
  const bans      = loadTempBans();
  const now       = Date.now();
  const remaining = [];
  for (const ban of bans) {
    if (now >= ban.unbanAt) {
      try {
        const guild = client.guilds.cache.get(ban.guildId);
        if (guild) {
          await guild.members.unban(ban.userId, 'Temporary ban expired');
          const logEmbed = new EmbedBuilder()
            .setTitle('🔓 Temp Ban Expired — Auto Unbanned').setColor(0x57f287)
            .addFields(
              { name: 'User',              value: `<@${ban.userId}> (${ban.userTag})`, inline: true },
              { name: 'Original Duration', value: ban.duration,                        inline: true },
            ).setTimestamp();
          await sendLog(client, logEmbed);
        }
      } catch { /* already unbanned or left */ }
    } else {
      remaining.push(ban);
    }
  }
  if (remaining.length !== bans.length) saveTempBans(remaining);
}

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLERS
// ─────────────────────────────────────────
process.on('unhandledRejection', err => console.error('❌ UNHANDLED REJECTION:', err));
process.on('uncaughtException',  err => console.error('❌ UNCAUGHT EXCEPTION:', err));

// ─────────────────────────────────────────
// CLIENT
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
  partials: ['CHANNEL', 'MESSAGE', 'REACTION'],
});

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} is online`);
  client.user.setPresence({
    activities: [{ name: 'players in GoldenHeart SMP | discord.gg/We5SpWv64T', type: ActivityType.Watching }],
    status: 'online',
  });
  const giveaways = loadGiveaways();
  const now = Date.now();
  for (const g of giveaways) {
    if (g.ended) continue;
    const remaining = g.endsAt - now;
    if (remaining <= 0) { endGiveaway(client, g); }
    else { setTimeout(() => endGiveaway(client, g), remaining); }
  }
  setInterval(() => checkBirthdays(client), 3600000);
  setInterval(() => checkReminders(client), 30000);
  setInterval(() => checkTempBans(client),  60000);
  checkBirthdays(client);
});

client.on('error',           err => console.error('❌ CLIENT ERROR:', err));
client.on('shardError',      err => console.error('❌ SHARD ERROR:', err));
client.on('shardDisconnect',     () => console.warn('⚠️ Shard disconnected'));

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

// ═══════════════════════════════════════════════════════════════
// SERVER EVENT LOGGING
// ═══════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async member => {
  if (member.guild.id !== GUILD_ID) return;
  const now = Date.now();
  recentJoins.push(now);
  while (recentJoins.length > 0 && now - recentJoins[0] > RAID_WINDOW_MS) recentJoins.shift();
  if (recentJoins.length >= RAID_THRESHOLD && !raidLockActive) {
    raidLockActive = true;
    try {
      const channels = member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
      for (const [, ch] of channels) {
        await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: false }).catch(() => {});
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
    } catch { /* ignore */ }
    setTimeout(async () => {
      raidLockActive = false;
      try {
        const channels = member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        for (const [, ch] of channels) {
          await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: null }).catch(() => {});
        }
        const logCh = await client.channels.fetch(STAFF_LOG_CHANNEL);
        await logCh.send('✅ Raid lock auto-removed after 5 minutes. Monitor the server.');
      } catch { /* ignore */ }
    }, 300000);
  }
  const embed = new EmbedBuilder()
    .setTitle('📥 Member Joined').setColor(0x57f287)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'User',            value: `<@${member.id}> (${member.user.tag})`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
  await sendLog(client, embed);
  try {
    const cardBuffer     = await generateWelcomeCard(member);
    const attachment     = new AttachmentBuilder(cardBuffer, { name: 'welcome.png' });
    const welcomeChannel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    await welcomeChannel.send({ content: `🎉 Welcome <@${member.id}> to **GoldenHeart SMP**!`, files: [attachment] });
  } catch (err) { console.error('Could not send welcome card:', err); }
});

client.on('guildMemberRemove', async member => {
  if (member.guild.id !== GUILD_ID) return;
  const embed = new EmbedBuilder()
    .setTitle('📤 Member Left').setColor(0xed4245)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'User',   value: `${member.user.tag}`, inline: true },
      { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` }).setTimestamp();
  await sendLog(client, embed);
});

client.on('messageDelete', async message => {
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (message.author?.bot) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Message Deleted').setColor(0xfee75c)
    .addFields(
      { name: 'Author',  value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Unknown', inline: true },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      { name: 'Content', value: message.content?.slice(0, 1024) || '*[no text content]*', inline: false },
    )
    .setFooter({ text: `Message ID: ${message.id}` }).setTimestamp();
  await sendLog(client, embed);
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.guild.id !== GUILD_ID) return;
  if (oldMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;
  const embed = new EmbedBuilder()
    .setTitle('✏️ Message Edited').setColor(0x5865f2)
    .addFields(
      { name: 'Author',  value: `<@${oldMsg.author?.id}> (${oldMsg.author?.tag})`, inline: true },
      { name: 'Channel', value: `<#${oldMsg.channelId}>`, inline: true },
      { name: 'Before',  value: oldMsg.content?.slice(0, 512) || '*empty*', inline: false },
      { name: 'After',   value: newMsg.content?.slice(0, 512) || '*empty*', inline: false },
    )
    .setFooter({ text: `[Jump to message](${newMsg.url})` }).setTimestamp();
  await sendLog(client, embed);
});

client.on('guildAuditLogEntryCreate', async (entry, guild) => {
  if (guild.id !== GUILD_ID) return;
  if (entry.action === AuditLogEvent.MemberBanAdd) {
    const embed = new EmbedBuilder()
      .setTitle('🔨 Member Banned').setColor(0xed4245)
      .addFields(
        { name: 'Banned User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By',          value: `<@${entry.executorId}>`, inline: true },
        { name: 'Reason',      value: entry.reason ?? 'No reason provided', inline: false },
      )
      .setFooter({ text: `Target ID: ${entry.targetId}` }).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberBanRemove) {
    const embed = new EmbedBuilder()
      .setTitle('🔓 Member Unbanned').setColor(0x57f287)
      .addFields(
        { name: 'User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By',   value: `<@${entry.executorId}>`, inline: true },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberKick) {
    const embed = new EmbedBuilder()
      .setTitle('👢 Member Kicked').setColor(0xffa500)
      .addFields(
        { name: 'Kicked User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By',          value: `<@${entry.executorId}>`, inline: true },
        { name: 'Reason',      value: entry.reason ?? 'No reason provided', inline: false },
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
        { name: 'User',   value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By',     value: `<@${entry.executorId}>`, inline: true },
        ...(isTimeout ? [{ name: 'Until', value: `<t:${Math.floor(new Date(timedOut.new).getTime() / 1000)}:F>`, inline: true }] : []),
        { name: 'Reason', value: entry.reason ?? 'No reason provided', inline: false },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    const added   = entry.changes?.filter(c => c.key === '$add').flatMap(c => c.new) ?? [];
    const removed = entry.changes?.filter(c => c.key === '$remove').flatMap(c => c.new) ?? [];
    const lines   = [...added.map(r => `➕ <@&${r.id}> added`), ...removed.map(r => `➖ <@&${r.id}> removed`)].join('\n');
    if (!lines) return;
    const embed = new EmbedBuilder()
      .setTitle('🎭 Member Roles Updated').setColor(0x9b59b6)
      .addFields(
        { name: 'User',    value: `<@${entry.targetId}>`, inline: true },
        { name: 'By',      value: `<@${entry.executorId}>`, inline: true },
        { name: 'Changes', value: lines, inline: false },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.ChannelCreate) {
    const embed = new EmbedBuilder()
      .setTitle('📢 Channel Created').setColor(0x57f287)
      .addFields(
        { name: 'Name', value: `#${entry.target?.name ?? 'unknown'}`, inline: true },
        { name: 'By',   value: `<@${entry.executorId}>`, inline: true },
      ).setTimestamp();
    await sendLog(client, embed);
  }
  if (entry.action === AuditLogEvent.ChannelDelete) {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Channel Deleted').setColor(0xed4245)
      .addFields(
        { name: 'Name', value: `#${entry.target?.name ?? 'unknown'}`, inline: true },
        { name: 'By',   value: `<@${entry.executorId}>`, inline: true },
      ).setTimestamp();
    await sendLog(client, embed);
  }
});

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
      { name: 'To',   value: `<#${newState.channelId}>`,  inline: true },
    ];
  } else return;
  const embed = new EmbedBuilder()
    .setTitle(title).setColor(color)
    .addFields({ name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true }, ...fields)
    .setTimestamp();
  await sendLog(client, embed);
});

// ═══════════════════════════════════════════════════════════════
// STARBOARD
// ═══════════════════════════════════════════════════════════════
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

  if (reaction.emoji.name === '⭐' && reaction.message.guild?.id === GUILD_ID) {
    const starCount    = reaction.count;
    if (starCount < STARBOARD_THRESHOLD) return;
    const starboardData = loadStarboard();
    const msgId         = reaction.message.id;
    if (starboardData[msgId]) {
      try {
        const sbChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID);
        const sbMsg     = await sbChannel.messages.fetch(starboardData[msgId]);
        const updatedEmbed = EmbedBuilder.from(sbMsg.embeds[0])
          .setFooter({ text: `⭐ ${starCount} | #${reaction.message.channel.name}` });
        await sbMsg.edit({ embeds: [updatedEmbed] });
      } catch { /* starboard message deleted */ }
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
      const sbMsg     = await sbChannel.send({ embeds: [embed] });
      starboardData[msgId] = sbMsg.id;
      saveStarboard(starboardData);
    } catch (err) { console.error('Starboard post error:', err); }
    return;
  }

  if (reaction.message.guild) {
    const msgId = reaction.message.id;
    if (!pollVotes.has(msgId)) return;
    const voteMap    = pollVotes.get(msgId);
    const pollEmojis = ['🇦', '🇧', '🇨', '🇩'];
    if (!pollEmojis.includes(reaction.emoji.name)) return;
    if (voteMap.has(user.id)) {
      try { await reaction.users.remove(user.id); } catch { /* permissions */ }
      try {
        const dmUser = await user.createDM();
        await dmUser.send(`⚠️ **GoldenHeart SMP — Poll Warning**\n\nYou tried to vote more than once on a poll. **Only one vote per person is allowed.**\n\nYour extra vote has been removed.`);
      } catch { /* DMs closed */ }
    } else {
      voteMap.set(user.id, reaction.emoji.name);
      pollVotes.set(msgId, voteMap);
    }
    return;
  }

  if (reaction.message.guild) return;
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
      const dm      = reaction.message.channel;
      const rateMsg = await dm.send({ embeds: [ratingEmbed] });
      for (const emoji of STAR_EMOJIS) await rateMsg.react(emoji);
      pendingFeedback.set(user.id, { stage: 'pick_rating', staffKey, messageId: rateMsg.id });
    } catch (err) { console.error('Could not send rating message:', err); }
    return;
  }

  if (session.stage === 'pick_rating') {
    const rating   = emojiIndex + 1;
    const staffKey = session.staffKey;
    pendingFeedback.set(user.id, { stage: 'await_comment', staffKey, rating, awaitingComment: true, messageId: session.messageId });
    try {
      const dm = reaction.message.channel;
      await dm.send(`${starsDisplay(rating)} Got it — **${rating}/5** for **${STAFF_MEMBERS[staffKey].label}**!\n\n💬 **Optional:** Type a comment about them, or type \`skip\` to submit now.`);
    } catch (err) { console.error('Could not send comment prompt:', err); }
  }
});

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.guild) {
    const msg     = message.content.toLowerCase();
    const content = message.content;

    // ── AFK ping detection ──
    if (message.mentions.users.size > 0) {
      const afkData = loadAFK();
      for (const [uid, data] of Object.entries(afkData)) {
        if (message.mentions.users.has(uid)) {
          const sinceMs = Date.now() - data.since;
          const since   = humanDuration(sinceMs);
          await message.reply(`💤 **${data.username}** is AFK: *${data.reason}* (since ${since} ago)`).catch(() => {});
        }
      }
    }

    // ── AFK removal ──
    const afkCache = loadAFK();
    if (afkCache[message.author.id]) {
      delete afkCache[message.author.id];
      saveAFK(afkCache);
      const notif = await message.reply(`👋 Welcome back, ${message.author.username}! Your AFK has been removed.`).catch(() => null);
      if (notif) autoDelete(notif, 5000);
    }

    // ── XP gain ──
    const xpNow  = Date.now();
    const lastXP = xpCooldown.get(message.author.id) || 0;
    if (xpNow - lastXP >= XP_COOLDOWN_MS) {
      xpCooldown.set(message.author.id, xpNow);
      const xpData = loadXP();
      const userId = message.author.id;
      if (!xpData[userId]) xpData[userId] = { xp: 0, level: 0, username: message.author.tag };
      const oldLevel = getLevelFromXP(xpData[userId].xp);
      xpData[userId].xp += XP_PER_MESSAGE;
      xpData[userId].username = message.author.tag;
      const newLevel = getLevelFromXP(xpData[userId].xp);
      if (newLevel > oldLevel) {
        xpData[userId].level = newLevel;
        try {
          const lvlChannel = await client.channels.fetch(LEVEL_UP_CHANNEL_ID);
          await lvlChannel.send(`🎉 <@${userId}> leveled up to **Level ${newLevel}**! Keep it up! 🚀`);
        } catch { /* channel not found */ }
        if (LEVEL_ROLES[newLevel]) {
          const member = message.member;
          if (member) await member.roles.add(LEVEL_ROLES[newLevel]).catch(() => {});
        }
      }
      saveXP(xpData);
    }

    // ── Cultural / country jokes ──
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
            { name: 'User',    value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
            { name: 'Message', value: content.slice(0, 1024), inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) { console.error('Cultural joke auto-mod error:', err); }
      return;
    }

    // ── Personal swearing ──
    const personalSwearPatterns = [
      /\b(fuck|shit|bitch|bastard|asshole|ass hole|dick|cunt|idiot|moron|dumbass|retard)\s*(you|u|ur|your|him|her|them|he|she|they)\b/i,
      /\byou\s*(fucking?|fuckin|shit(ty)?|stupid|dumb|idiot|moron|bitch|asshole|dick|cunt|retard)\b/i,
      /\b(fuck|shit|bitch)\s+off\b/i,
    ];
    if (personalSwearPatterns.some(p => p.test(content))) {
      try {
        await message.delete();
        const warns  = loadWarns();
        const userId = message.author.id;
        if (!warns[userId]) warns[userId] = { username: message.author.tag, warns: [] };
        warns[userId].warns.push({ reason: 'Using swear words directed at another person', warnedBy: 'AutoMod', timestamp: new Date().toISOString() });
        saveWarns(warns);
        const warnCount   = warns[userId].warns.length;
        const timeoutMins = getTimeoutDuration(warnCount);
        if (timeoutMins) {
          try { await message.member.timeout(timeoutMins * 60 * 1000, `AutoMod Warn #${warnCount}: Swearing at a person`); } catch { /* bot role too low */ }
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
            { name: 'User',    value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
            { name: 'Warns',   value: `${warnCount}/8`, inline: true },
            { name: 'Message', value: content.slice(0, 1024), inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) { console.error('Personal swear auto-mod error:', err); }
      return;
    }

    // ── Spam / flooding ──
    if (!hasModPermission(message.member)) {
      const onCooldown = spamCooldown.get(message.author.id);
      if (!onCooldown || Date.now() - onCooldown > 15000) {
        const violation = checkSpam(message);
        if (violation) {
          spamCooldown.set(message.author.id, Date.now());
          try {
            const matched  = violation.matchedMessages || [message];
            const toDelete = matched.slice(0, -1);
            for (const m of toDelete) await m.delete().catch(() => {});
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
                { name: 'User',    value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                { name: 'Type',    value: labelMap[violation.type] || violation.type, inline: true },
                { name: 'Detail',  value: violation.detail, inline: false },
              ).setTimestamp();
            await sendLog(client, logEmbed);
          } catch (err) { console.error('Spam auto-mod error:', err); }
          return;
        }
      }
    }

    if (msg === 'ip')       return message.reply(`💛 **GoldenHeart SMP** is now online!\n🌍 **IP:** \`goldenheartsmp.minecraftnoob.com:25565\`\n⚔️ Join now and start your journey!`);
    if (msg === 'rules')    return message.reply(`📜 Use \`/rules\` to see the full server rules!\n\n📌 Or check: <#1432277447440597028>`);
    if (msg === 'features') return message.reply(`📋 Use \`/features\` to see everything you can do as a member!`);
    return;
  }

  // ── DM: Feedback comment ──
  const userId    = message.author.id;
  const fbSession = pendingFeedback.get(userId);
  if (fbSession?.awaitingComment) {
    pendingFeedback.delete(userId);
    const comment   = message.content.trim().toLowerCase() === 'skip' ? null : message.content.trim();
    const staffKey  = fbSession.staffKey;
    const staffInfo = STAFF_MEMBERS[staffKey];
    const rating    = fbSession.rating;
    const feedbackData = loadFeedback();
    if (!feedbackData[staffKey]) feedbackData[staffKey] = { label: staffInfo.label, type: staffInfo.type, entries: [] };
    feedbackData[staffKey].entries.push({ from: message.author.tag, fromId: message.author.id, rating, comment: comment || '', timestamp: new Date().toISOString() });
    saveFeedback(feedbackData);
    try {
      const staffUser = await client.users.fetch(staffInfo.id);
      const dmEmbed = new EmbedBuilder()
        .setTitle('📬 You received new feedback!').setColor(0xf0b429)
        .addFields(
          { name: 'Rating',  value: `${starsDisplay(rating)} (${rating}/5)`, inline: true },
          { name: 'From',    value: `Anonymous`, inline: true },
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
  const currentQ  = questions[session.step];
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
  const entry = { id: appId, userId, userTag: message.author.tag, role: session.role, submittedAt: new Date().toISOString(), answers: session.answers };
  saveApp(session.role, entry);
  await message.channel.send(`✅ **Application submitted!**\n\nYour **${APP_NAMES[session.role]}** application has been received.\n📋 Application ID: \`${appId}\`\n\nYou'll receive a DM when the staff team has reviewed it. Thanks for applying!`);
  const embed = new EmbedBuilder()
    .setTitle(`📋 New Application — ${APP_NAMES[session.role]}`)
    .setColor(session.role === 'chatmod' ? 0xf0b429 : session.role === 'helper' ? 0x5b8dee : 0x3dd68c)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Applicant', value: `<@${userId}> (${message.author.tag})`, inline: true },
      { name: '🆔 App ID',    value: `\`${appId}\``,                         inline: true },
      { name: '📅 Submitted', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false },
      ...Object.entries(session.answers).map(([k, v]) => ({
        name:  k.charAt(0).toUpperCase() + k.slice(1),
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

// ═══════════════════════════════════════════════════════════════
// INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {

    // ─── FEATURES ───
    if (interaction.commandName === 'features') {
      const embed = new EmbedBuilder()
        .setTitle('✨ GoldenHeart SMP — Member Features').setColor(0xf0b429)
        .setDescription('Here\'s everything available to you as a member of GoldenHeart SMP!')
        .addFields(
          { name: '🔐 Verification',        value: 'Click the **Verify** button in the verification channel to unlock full server access.', inline: false },
          { name: '📋 Staff Applications',  value: 'Use the **Staff Application panel** to apply for Chat Moderator, Helper, or Minecraft Chat Moderator.', inline: false },
          { name: '⭐ Staff Feedback',       value: 'Use `/feedback` to rate any staff member out of 5 stars via DM. All feedback is **anonymous**.', inline: false },
          { name: '💡 Suggestions',          value: 'Use `/suggest` to submit server ideas. They appear in the suggestions channel with **👍 / 👎** voting.', inline: false },
          { name: '🌍 Minecraft Server',     value: 'Type `ip` in any channel to get the MC server IP.\n> `goldenheartsmp.minecraftnoob.com:25565`', inline: false },
          { name: '📊 Leveling & XP',        value: 'Earn XP by chatting! Use `/rank` to see your level and `/leaderboard` for the top 10.', inline: false },
          { name: '🎉 Giveaways',            value: 'Watch for giveaway announcements — react with 🎉 to enter!', inline: false },
          { name: '💤 AFK System',           value: 'Use `/afk <reason>` to mark yourself AFK. The bot will notify others who ping you.', inline: false },
          { name: '⏰ Reminders',            value: 'Use `/remindme <time> <text>` to set a personal reminder via DM.', inline: false },
          { name: '🎂 Birthdays',            value: 'Use `/birthday set` to register your birthday. The bot will celebrate it server-wide!', inline: false },
          { name: '🌟 Starboard',            value: `Get ${STARBOARD_THRESHOLD}+ ⭐ reactions on your message to have it featured in the starboard!`, inline: false },
          { name: '📜 Rules',                value: 'Use `/rules` to view the full server rule set at any time.', inline: false },
          { name: '🗳️ Polls',                value: 'Staff may create polls in the server — react with the emoji letter to cast your vote!', inline: false },
        )
        .setFooter({ text: 'GoldenHeart SMP — Glad to have you here! 💛' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ─── RULES ───
    if (interaction.commandName === 'rules') {
      const embed = new EmbedBuilder()
        .setTitle('📜 GoldenHeart SMP — Server Rules').setColor(0xed4245)
        .setDescription('Please read all rules carefully. **"I didn\'t know" is not an excuse.**\n\nUse `/rulebook_mc`, `/rulebook_chat`, or `/rulebook_general` to browse the full paginated rulebook!')
        .addFields(
          { name: '🌍 Rule 1 — Cultural & Country Respect  🚨 SEVERE', value: 'Jokes, memes, stereotypes targeting any country, culture, race, or religion are **strictly prohibited**.\n**Punishment:** Message deleted + **immediate 24-hour timeout**.\n**Repeat:** Permanent ban.', inline: false },
          { name: '🤬 Rule 2 — Swearing Policy', value: 'Swearing about situations ✅ allowed. Swearing **at** a person ❌ NOT allowed.\n**1 warn + timeout for directing swears at someone.**', inline: false },
          { name: '🔇 Rule 3 — No Harassment',      value: 'No threats, doxxing, or hate speech of any kind.', inline: false },
          { name: '🔞 Rule 4 — Keep It Appropriate', value: 'No NSFW content, graphic violence, or disturbing material.', inline: false },
          { name: '🔗 Rule 5 — No Spam',            value: 'No spam, repeated messages, or unsolicited promotion.', inline: false },
          { name: '🛡️ Rule 6 — Respect Staff',     value: 'Follow staff instructions. Disrespecting staff may result in additional warnings.', inline: false },
          { name: '⚠️ Warning System', value: '```\nWarn 1  →  ⚠️  Warning only\nWarn 2  →  ⚠️  Warning only\nWarn 3  →  ⏱️  30-minute timeout\nWarn 4  →  ⏱️  45-minute timeout\nWarn 5  →  ⏱️  60-minute timeout\nWarn 6  →  ⏱️  75-minute timeout\nWarn 7  →  ⏱️  90-minute timeout\nWarn 8  →  🔴  28-day (permanent) mute\n```', inline: false },
        )
        .setFooter({ text: 'GoldenHeart SMP — Breaking rules affects everyone. Be kind. 💛' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ─── RULEBOOK: MINECRAFT SERVER RULES ───
    if (interaction.commandName === 'rulebook_mc') {
      const book  = RULEBOOK_MC;
      const embed = buildBookEmbed(book.title, book.pages, 0, book.color);
      const row   = buildBookRow(0, book.pages.length, 'TEMP_MC');
      const sent  = await interaction.channel.send({ embeds: [embed], components: [row] });
      activeBooks.set(sent.id, { pages: book.pages, currentPage: 0, bookTitle: book.title, color: book.color });
      const realRow = buildBookRow(0, book.pages.length, sent.id);
      await sent.edit({ components: [realRow] });
      return interaction.reply({ content: '📖 MC Server Rulebook posted!', ephemeral: true });
    }

    // ─── RULEBOOK: CHAT RULES ───
    if (interaction.commandName === 'rulebook_chat') {
      const book  = RULEBOOK_CHAT;
      const embed = buildBookEmbed(book.title, book.pages, 0, book.color);
      const row   = buildBookRow(0, book.pages.length, 'TEMP_CHAT');
      const sent  = await interaction.channel.send({ embeds: [embed], components: [row] });
      activeBooks.set(sent.id, { pages: book.pages, currentPage: 0, bookTitle: book.title, color: book.color });
      const realRow = buildBookRow(0, book.pages.length, sent.id);
      await sent.edit({ components: [realRow] });
      return interaction.reply({ content: '📖 Chat Rulebook posted!', ephemeral: true });
    }

    // ─── RULEBOOK: GENERAL RULES ───
    if (interaction.commandName === 'rulebook_general') {
      const book  = RULEBOOK_GENERAL;
      const embed = buildBookEmbed(book.title, book.pages, 0, book.color);
      const row   = buildBookRow(0, book.pages.length, 'TEMP_GEN');
      const sent  = await interaction.channel.send({ embeds: [embed], components: [row] });
      activeBooks.set(sent.id, { pages: book.pages, currentPage: 0, bookTitle: book.title, color: book.color });
      const realRow = buildBookRow(0, book.pages.length, sent.id);
      await sent.edit({ components: [realRow] });
      return interaction.reply({ content: '📖 General Rulebook posted!', ephemeral: true });
    }

    // ─── APPLY PANEL ───
    if (interaction.commandName === 'applypanel') {
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

    // ─── ANNOUNCE ───
    if (interaction.commandName === 'announce') {
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
        await message.delete().catch(() => {});
      });
      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0)
          interaction.followUp({ content: '⏰ Timed out — no message received.', ephemeral: true }).catch(() => {});
      });
    }

    // ─── VERIFY PANEL ───
    if (interaction.commandName === 'verifypanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: 'Admins only.', ephemeral: true });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify').setLabel('✅ Verify').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ content: `🔐 **Verification Required**\n\nClick the button below to verify yourself and gain access to the server.`, components: [row] });
      return interaction.reply({ content: 'Verify panel sent!', ephemeral: true });
    }

    // ─── BAN ───
    if (interaction.commandName === 'ban') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const target   = interaction.options.getMember('user');
      const reason   = interaction.options.getString('reason') || 'No reason provided';
      const duration = interaction.options.getString('duration');
      if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      if (target.user.bot) return interaction.reply({ content: '❌ Cannot ban a bot.', ephemeral: true });
      if (target.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Cannot ban an admin.', ephemeral: true });
      await interaction.deferReply();
      try {
        try { await target.send(`🔨 **You have been ${duration ? 'temporarily ' : ''}banned from GoldenHeart SMP.**\n\n**Reason:** ${reason}${duration ? `\n**Duration:** ${duration}` : ''}`); } catch { /* DMs closed */ }
        await target.ban({ reason });
        if (duration) {
          const ms = parseDuration(duration);
          if (!ms) return interaction.editReply('❌ Invalid duration format. Use e.g. `1d`, `7d`, `2h`.');
          const unbanAt = Date.now() + ms;
          const bans = loadTempBans();
          bans.push({ userId: target.id, userTag: target.user.tag, guildId: GUILD_ID, reason, duration, unbanAt });
          saveTempBans(bans);
          setTimeout(() => checkTempBans(client), ms + 1000);
        }
        const logEmbed = new EmbedBuilder()
          .setTitle(duration ? `🔨 Member Temp-Banned (${duration})` : '🔨 Member Permanently Banned').setColor(0xed4245)
          .addFields(
            { name: 'User',     value: `${target.user.tag} (<@${target.id}>)`, inline: true },
            { name: 'By',       value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Duration', value: duration || 'Permanent', inline: true },
            { name: 'Reason',   value: reason, inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
        return interaction.editReply(`🔨 **${target.user.tag}** has been ${duration ? `temp-banned for **${duration}**` : '**permanently banned**'}.\n📋 **Reason:** ${reason}`);
      } catch (err) {
        console.error('Ban error:', err);
        return interaction.editReply('❌ Failed to ban. Check bot role position.');
      }
    }

    // ─── KICK ───
    if (interaction.commandName === 'kick') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      if (target.user.bot) return interaction.reply({ content: '❌ Cannot kick a bot.', ephemeral: true });
      if (target.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Cannot kick an admin.', ephemeral: true });
      try {
        try { await target.send(`👢 **You have been kicked from GoldenHeart SMP.**\n\n**Reason:** ${reason}`); } catch { /* DMs closed */ }
        await target.kick(reason);
        const logEmbed = new EmbedBuilder()
          .setTitle('👢 Member Kicked').setColor(0xffa500)
          .addFields(
            { name: 'User',   value: `${target.user.tag} (<@${target.id}>)`, inline: true },
            { name: 'By',     value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason, inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
        return interaction.reply(`👢 **${target.user.tag}** has been kicked.\n📋 **Reason:** ${reason}`);
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to kick. Check bot role position.', ephemeral: true });
      }
    }

    // ─── PURGE ───
    if (interaction.commandName === 'purge') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100)
        return interaction.reply({ content: '❌ Amount must be between 1 and 100.', ephemeral: true });
      try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        const reply   = await interaction.reply({ content: `🗑️ Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.`, fetchReply: true });
        autoDelete(reply, 5000);
        const logEmbed = new EmbedBuilder()
          .setTitle('🗑️ Purge').setColor(0xfee75c)
          .addFields(
            { name: 'By',      value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
            { name: 'Count',   value: `${deleted.size}`, inline: true },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        console.error('Purge error:', err);
        return interaction.reply({ content: '❌ Failed to delete messages. Messages older than 14 days cannot be bulk-deleted.', ephemeral: true });
      }
    }

    // ─── LOCK ───
    if (interaction.commandName === 'lock') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason  = interaction.options.getString('reason') || 'No reason provided';
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply(`🔒 <#${channel.id}> has been **locked**.\n📋 **Reason:** ${reason}`);
        const logEmbed = new EmbedBuilder()
          .setTitle('🔒 Channel Locked').setColor(0xed4245)
          .addFields(
            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'By',      value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason',  value: reason, inline: false },
          ).setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to lock channel.', ephemeral: true });
      }
    }

    // ─── UNLOCK ───
    if (interaction.commandName === 'unlock') {
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
            { name: 'By',      value: `<@${interaction.user.id}>`, inline: true },
          ).setTimestamp();
        await sendLog(client, logEmbed);
        if (raidLockActive) raidLockActive = false;
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to unlock channel.', ephemeral: true });
      }
    }

    // ─── SLOWMODE ───
    if (interaction.commandName === 'slowmode') {
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

    // ─── WARN ───
    if (interaction.commandName === 'warn') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ You do not have permission to warn members.', ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      if (target.user.bot) return interaction.reply({ content: '❌ Cannot warn a bot.', ephemeral: true });
      if (target.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Cannot warn an admin.', ephemeral: true });
      const warns  = loadWarns();
      const userId = target.user.id;
      if (!warns[userId]) warns[userId] = { username: target.user.tag, warns: [] };
      warns[userId].warns.push({ reason, warnedBy: interaction.user.tag, timestamp: new Date().toISOString() });
      saveWarns(warns);
      const warnCount   = warns[userId].warns.length;
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
      return interaction.reply({ content: `⚠️ **${target.user.tag}** has been warned.\n📋 **Reason:** ${reason}\n🔢 **Total warns:** ${warnCount}/8${punishmentText}` });
    }

    // ─── UNWARN ───
    if (interaction.commandName === 'unwarn') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const target = interaction.options.getUser('user');
      const warns  = loadWarns();
      const userId = target.id;
      if (!warns[userId] || warns[userId].warns.length === 0)
        return interaction.reply({ content: `✅ **${target.tag}** has no warns.`, ephemeral: true });
      warns[userId].warns.pop();
      if (warns[userId].warns.length === 0) delete warns[userId];
      saveWarns(warns);
      const remaining = warns[userId]?.warns.length ?? 0;
      return interaction.reply({ content: `✅ Removed latest warn from **${target.tag}**.\n🔢 **Remaining warns:** ${remaining}` });
    }

    // ─── WARNINGS ───
    if (interaction.commandName === 'warnings') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const target = interaction.options.getUser('user');
      const warns  = loadWarns();
      const userId = target.id;
      if (!warns[userId] || warns[userId].warns.length === 0)
        return interaction.reply({ content: `✅ **${target.tag}** has no warns.`, ephemeral: true });
      const list = warns[userId].warns.map((w, i) => {
        const date = new Date(w.timestamp).toLocaleDateString();
        return `**#${i + 1}** — ${w.reason} *(by ${w.warnedBy} on ${date})*`;
      }).join('\n');
      const warnCount   = warns[userId].warns.length;
      const nextTimeout = getTimeoutDuration(warnCount + 1);
      return interaction.reply({
        content: `📋 **Warns for ${target.tag}** — ${warnCount}/8\n\n${list}\n\n${nextTimeout ? `⏭️ Next warn → **${nextTimeout}-min timeout**` : warnCount >= 8 ? '🔴 Max warns reached' : ''}`,
        ephemeral: true,
      });
    }

    // ─── CLEARWARNS ───
    if (interaction.commandName === 'clearwarns') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      const target = interaction.options.getUser('user');
      const warns  = loadWarns();
      delete warns[target.id];
      saveWarns(warns);
      return interaction.reply({ content: `🧹 Cleared all warns for **${target.tag}**.` });
    }

    // ─── SERVER INFO ───
    if (interaction.commandName === 'serverinfo') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      await guild.members.fetch();
      const allMembers    = guild.members.cache;
      const totalMembers  = allMembers.filter(m => !m.user.bot).size;
      const totalBots     = allMembers.filter(m => m.user.bot).size;
      const onlineMembers = allMembers.filter(m => !m.user.bot && m.presence?.status && m.presence.status !== 'offline').size;
      const totalAll      = allMembers.size;
      const warns         = loadWarns();
      const warnedUsers   = Object.keys(warns).length;
      const totalWarns    = Object.values(warns).reduce((acc, u) => acc + u.warns.length, 0);
      const warnList = Object.entries(warns)
        .sort((a, b) => b[1].warns.length - a[1].warns.length)
        .slice(0, 10)
        .map(([uid, data], i) => `\`${i + 1}.\` <@${uid}> — **${data.warns.length}** warn(s)`)
        .join('\n') || 'No warns on record.';
      const embed = new EmbedBuilder()
        .setTitle(`📊 Server Info — ${guild.name}`).setColor(0x5865f2)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👥 Total Members',      value: `${totalAll}`,      inline: true },
          { name: '🧑 Human Members',      value: `${totalMembers}`,  inline: true },
          { name: '🤖 Bots',               value: `${totalBots}`,     inline: true },
          { name: '🟢 Active (Online)',    value: `${onlineMembers}`, inline: true },
          { name: '📅 Server Created',     value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: '👑 Owner',              value: `<@${guild.ownerId}>`, inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '⚠️ Total Warns Issued', value: `${totalWarns}`,    inline: true },
          { name: '👤 Warned Users',       value: `${warnedUsers}`,   inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '📋 Top Warned Members', value: warnList,           inline: false },
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // ─── FEEDBACK ───
    if (interaction.commandName === 'feedback') {
      await interaction.reply({ content: `📬 Check your **DMs** — I've sent you the staff list to rate!`, ephemeral: true });
      const staffList  = Object.entries(STAFF_MEMBERS);
      const memberLines = staffList.map(([key, info], i) => `${STAR_EMOJIS[i]}  **${info.label}** — ${info.type}`);
      const dmEmbed = new EmbedBuilder()
        .setTitle('⭐ Staff Feedback — Who do you want to rate?').setColor(0xf0b429)
        .setDescription(`React with the **number** next to the staff member you'd like to rate!\n\n${memberLines.join('\n')}\n\n> After reacting, I'll ask for a **1–5 star rating** and an optional comment.`)
        .setFooter({ text: 'Your feedback is anonymous and sent directly to the staff member.' }).setTimestamp();
      try {
        const dm    = await interaction.user.createDM();
        const dmMsg = await dm.send({ embeds: [dmEmbed] });
        for (let i = 0; i < staffList.length && i < 5; i++) await dmMsg.react(STAR_EMOJIS[i]);
        pendingFeedback.set(interaction.user.id, { stage: 'pick_staff', messageId: dmMsg.id, staffList });
      } catch (err) {
        console.error('Could not DM user for feedback:', err);
        await interaction.followUp({ content: `❌ I couldn't DM you! Please enable **Direct Messages** from server members in your Privacy Settings.`, ephemeral: true });
      }
      return;
    }

    // ─── VIEW FEEDBACK ───
    if (interaction.commandName === 'viewfeedback') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const staffKey     = interaction.options.getString('staff');
      const feedbackData = loadFeedback();
      if (staffKey) {
        const staffInfo = STAFF_MEMBERS[staffKey];
        const data      = feedbackData[staffKey];
        if (!data || data.entries.length === 0)
          return interaction.reply({ content: `📋 No feedback found for **${staffInfo?.label ?? staffKey}**.`, ephemeral: true });
        const avgRating  = (data.entries.reduce((s, e) => s + e.rating, 0) / data.entries.length).toFixed(1);
        const recentList = data.entries.slice(-5).reverse().map((e, i) =>
          `**${i + 1}.** ${starsDisplay(e.rating)} — *"${e.comment || 'No comment'}"* *(${new Date(e.timestamp).toLocaleDateString()})*`
        ).join('\n');
        const embed = new EmbedBuilder()
          .setTitle(`📋 Feedback — ${data.label} (${data.type})`).setColor(0x5b8dee)
          .addFields(
            { name: '⭐ Average Rating', value: `${avgRating}/5`, inline: true },
            { name: '📝 Total Reviews',  value: `${data.entries.length}`, inline: true },
            { name: '🕐 Recent Feedback (last 5)', value: recentList || 'None', inline: false },
          ).setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const lines = Object.entries(STAFF_MEMBERS).map(([key, info]) => {
          const data = feedbackData[key];
          if (!data || data.entries.length === 0) return `**${info.label}** (${info.type}) — No feedback yet`;
          const avg = (data.entries.reduce((s, e) => s + e.rating, 0) / data.entries.length).toFixed(1);
          return `**${info.label}** (${info.type}) — ${starsDisplay(Math.round(Number(avg)))} **${avg}/5** *(${data.entries.length} review${data.entries.length !== 1 ? 's' : ''})*`;
        }).join('\n');
        const embed = new EmbedBuilder()
          .setTitle('📋 Staff Performance Overview').setColor(0xf0b429)
          .setDescription(lines || 'No feedback data yet.').setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // ─── STAFF STATS ───
    if (interaction.commandName === 'staffstats') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const feedbackData = loadFeedback();
      const rows = Object.entries(STAFF_MEMBERS).map(([key, info]) => {
        const data = feedbackData[key];
        if (!data || data.entries.length === 0) return `**${info.label}** (${info.type})\n> No reviews yet`;
        const avg  = (data.entries.reduce((s, e) => s + e.rating, 0) / data.entries.length).toFixed(1);
        const last = data.entries[data.entries.length - 1];
        const lastDate = new Date(last.timestamp).toLocaleDateString();
        return `**${info.label}** (${info.type})\n> ${starsDisplay(Math.round(Number(avg)))} **${avg}/5** — ${data.entries.length} review${data.entries.length !== 1 ? 's' : ''} — Last: ${lastDate}`;
      }).join('\n\n');
      const embed = new EmbedBuilder()
        .setTitle('📊 Staff Performance Stats').setColor(0x9b59b6)
        .setDescription(rows || 'No feedback data yet.')
        .setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ─── SUGGEST ───
    if (interaction.commandName === 'suggest') {
      const text   = interaction.options.getString('suggestion');
      const suggId = 'SUG-' + Date.now().toString(36).toUpperCase();
      saveSuggestion({ id: suggId, from: interaction.user.tag, fromId: interaction.user.id, text, timestamp: new Date().toISOString(), status: 'pending' });
      const embed = new EmbedBuilder()
        .setTitle('💡 New Suggestion').setColor(0xf0b429).setDescription(text)
        .addFields(
          { name: '👤 Submitted by',  value: `<@${interaction.user.id}>`, inline: true },
          { name: '🆔 Suggestion ID', value: `\`${suggId}\``,             inline: true },
          { name: '📌 Status',        value: '🟡 Pending',                inline: true },
        )
        .setFooter({ text: 'React below to vote!' }).setTimestamp();
      try {
        const ch  = await client.channels.fetch(SUGGESTIONS_CHANNEL_ID);
        const msg = await ch.send({ embeds: [embed] });
        await msg.react('👍');
        await msg.react('👎');
      } catch (err) { console.error('Could not post suggestion:', err); }
      return interaction.reply({ content: `✅ Your suggestion (\`${suggId}\`) has been submitted!`, ephemeral: true });
    }

    // ─── VIEW SUGGESTIONS ───
    if (interaction.commandName === 'viewsuggestions') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const suggestions = loadSuggestions();
      if (suggestions.length === 0)
        return interaction.reply({ content: '📋 No suggestions yet.', ephemeral: true });
      const statusFilter = interaction.options.getString('status') || 'all';
      const filtered = statusFilter === 'all' ? suggestions : suggestions.filter(s => s.status === statusFilter);
      const statusEmoji = { pending: '🟡', accepted: '✅', denied: '❌', 'in-progress': '🔄' };
      const lines = filtered.slice(-20).reverse().map((s, i) =>
        `**${i + 1}.** \`${s.id}\` — ${statusEmoji[s.status] || '🟡'} ${s.status || 'pending'}\n> ${s.text.slice(0, 80)}${s.text.length > 80 ? '...' : ''}\n> *by ${s.from}*`
      ).join('\n\n');
      const embed = new EmbedBuilder()
        .setTitle('💡 Suggestions').setColor(0xf0b429)
        .setDescription(lines || 'No suggestions match this filter.')
        .setFooter({ text: `Showing last 20 | Filter: ${statusFilter}` }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ─── UPDATE SUGGESTION ───
    if (interaction.commandName === 'suggestion') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const suggId      = interaction.options.getString('id');
      const newStatus   = interaction.options.getString('status');
      const suggestions = loadSuggestions();
      const idx = suggestions.findIndex(s => s.id === suggId);
      if (idx === -1)
        return interaction.reply({ content: `❌ Suggestion \`${suggId}\` not found.`, ephemeral: true });
      suggestions[idx].status = newStatus;
      writeJSON(SUGGESTIONS_FILE, suggestions);
      const statusEmoji = { accepted: '✅', denied: '❌', 'in-progress': '🔄', pending: '🟡' };
      return interaction.reply({ content: `${statusEmoji[newStatus] || '🟡'} Suggestion \`${suggId}\` marked as **${newStatus}**.` });
    }

    // ─── POLL ───
    if (interaction.commandName === 'poll') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      const question        = interaction.options.getString('question');
      const durationHours   = interaction.options.getInteger('duration') || 0;
      const durationMinutes = interaction.options.getInteger('minutes') || 0;
      let duration = durationHours + (durationMinutes / 60);
      if (duration <= 0) duration = 24;
      const durationFinal = Math.max(1, Math.ceil(duration));
      const durationLabel = durationHours > 0 && durationMinutes > 0
        ? `${durationHours}h ${durationMinutes}m`
        : durationMinutes > 0 ? `${durationMinutes}m` : `${durationHours || 24}h`;
      const optA       = interaction.options.getString('option_a');
      const optB       = interaction.options.getString('option_b');
      const optC       = interaction.options.getString('option_c');
      const optD       = interaction.options.getString('option_d');
      const rawOptions = [optA, optB, optC, optD].filter(Boolean);
      try {
        const answers = rawOptions.map(text => ({ poll_media: { text } }));
        await client.rest.post(Routes.channelMessages(interaction.channelId), {
          body: {
            content: '@everyone 📊 A new poll is live — cast your vote!',
            poll: { question: { text: question }, answers, duration: durationFinal, allow_multiselect: false },
          },
        });
        return interaction.reply({ content: '✅ Poll posted!', ephemeral: true });
      } catch (err) {
        console.error('Native poll failed, falling back to embed poll:', err);
        const emojis      = ['🇦', '🇧', '🇨', '🇩'];
        const optionLines = rawOptions.map((o, i) => `${emojis[i]} **${o}**`).join('\n\n');
        const embed = new EmbedBuilder()
          .setTitle(`📊 ${question}`).setColor(0x5865f2).setDescription(optionLines)
          .addFields({ name: '🗳️ How to vote', value: 'React with **one** letter emoji. One vote per person!', inline: false })
          .setFooter({ text: `Poll by ${interaction.user.tag} • Closes in ${durationLabel}` }).setTimestamp();
        const pollMsg = await interaction.channel.send({ content: '@everyone', embeds: [embed] });
        for (let i = 0; i < rawOptions.length; i++) await pollMsg.react(emojis[i]);
        pollVotes.set(pollMsg.id, new Map());
        return interaction.reply({ content: '✅ Poll posted!', ephemeral: true });
      }
    }

    // ─── RANK ───
    if (interaction.commandName === 'rank') {
      const target = interaction.options.getUser('user') || interaction.user;
      const xpData = loadXP();
      const data   = xpData[target.id];
      if (!data || data.xp === 0) {
        return interaction.reply({ content: `📊 **${target.username}** hasn't earned any XP yet.`, ephemeral: true });
      }
      const level       = getLevelFromXP(data.xp);
      const xpThisLevel = data.xp - xpForLevel(level);
      const xpNeeded    = xpForLevel(level + 1) - xpForLevel(level);
      const progress    = Math.floor((xpThisLevel / xpNeeded) * 20);
      const bar         = '█'.repeat(progress) + '░'.repeat(20 - progress);
      const sorted = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
      const rank   = sorted.findIndex(([id]) => id === target.id) + 1;
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${target.username}'s Rank`).setColor(0xf0b429)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '🏅 Rank',    value: `#${rank}`,    inline: true },
          { name: '⭐ Level',   value: `${level}`,     inline: true },
          { name: '✨ Total XP', value: `${data.xp}`, inline: true },
          { name: `Progress to Level ${level + 1}`, value: `\`[${bar}]\` ${xpThisLevel}/${xpNeeded} XP`, inline: false },
        )
        .setFooter({ text: 'Keep chatting to earn more XP!' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ─── LEADERBOARD ───
    if (interaction.commandName === 'leaderboard') {
      const xpData = loadXP();
      const sorted = Object.entries(xpData)
        .filter(([, d]) => d.xp > 0)
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, 10);
      if (sorted.length === 0)
        return interaction.reply({ content: '📊 No XP data yet — start chatting!', ephemeral: true });
      const medals = ['🥇', '🥈', '🥉'];
      const lines  = sorted.map(([uid, data], i) => {
        const level = getLevelFromXP(data.xp);
        const medal = medals[i] || `\`${i + 1}.\``;
        return `${medal} <@${uid}> — **Level ${level}** (${data.xp} XP)`;
      }).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('🏆 XP Leaderboard — Top 10').setColor(0xf0b429)
        .setDescription(lines)
        .setFooter({ text: 'Earn XP by chatting every minute!' }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ─── GIVEAWAY ───
    if (interaction.commandName === 'giveaway') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'start') {
        if (!hasModPermission(interaction.member))
          return interaction.reply({ content: '❌ No permission.', ephemeral: true });
        const prize    = interaction.options.getString('prize');
        const duration = interaction.options.getString('duration');
        const winners  = interaction.options.getInteger('winners') || 1;
        const channel  = interaction.options.getChannel('channel') || interaction.channel;
        const ms       = parseDuration(duration);
        if (!ms) return interaction.reply({ content: '❌ Invalid duration. Use e.g. `1h`, `30m`, `2d`.', ephemeral: true });
        const endsAt   = Date.now() + ms;
        const endsAtTs = Math.floor(endsAt / 1000);
        const embed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY').setColor(0xf0b429)
          .setDescription(`**${prize}**\n\nReact with 🎉 to enter!\n\n⏰ **Ends:** <t:${endsAtTs}:R> (<t:${endsAtTs}:F>)\n🏆 **Winners:** ${winners}\n🎟️ **Hosted by:** <@${interaction.user.id}>`)
          .setFooter({ text: `Ends at` }).setTimestamp(endsAt);
        const msg = await channel.send({ embeds: [embed] });
        await msg.react('🎉');
        const giveawayData = { messageId: msg.id, channelId: channel.id, prize, winners, endsAt, hostId: interaction.user.id, ended: false };
        const giveaways = loadGiveaways();
        giveaways.push(giveawayData);
        saveGiveaways(giveaways);
        setTimeout(() => endGiveaway(client, giveawayData), ms);
        return interaction.reply({ content: `✅ Giveaway started in <#${channel.id}>!`, ephemeral: true });
      }
      if (sub === 'reroll') {
        if (!hasModPermission(interaction.member))
          return interaction.reply({ content: '❌ No permission.', ephemeral: true });
        const messageId = interaction.options.getString('message_id');
        const giveaways = loadGiveaways();
        const giveaway  = giveaways.find(g => g.messageId === messageId);
        if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
        await endGiveaway(client, giveaway);
        return interaction.reply({ content: '🔄 Giveaway rerolled!', ephemeral: true });
      }
    }

    // ─── MC SERVER STATUS ───
    if (interaction.commandName === 'serverstatus') {
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
          { name: '🌍 IP',             value: '`goldenheartsmp.minecraftnoob.com:25565`', inline: false },
          { name: '👥 Players',        value: `${status.players?.online ?? 0} / ${status.players?.max ?? 0}`, inline: true },
          { name: '🖥️ Version',       value: status.version || 'Unknown', inline: true },
          { name: '📡 Motd',           value: status.motd?.clean || '*No MOTD*', inline: false },
          { name: '📋 Online Players', value: playerList.slice(0, 1024), inline: false },
        )
        .setFooter({ text: 'Powered by mcsrvstat.us' }).setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // ─── MC PLAYER LOOKUP ───
    if (interaction.commandName === 'mcplayer') {
      const username = interaction.options.getString('username');
      await interaction.deferReply();
      try {
        const profile = await fetchJSON(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
        if (!profile || !profile.id) {
          return interaction.editReply(`❌ Player **${username}** not found. Check the spelling and try again.`);
        }
        const uuid      = profile.id;
        const formatted = `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20)}`;
        const skinHead  = `https://mc-heads.net/avatar/${uuid}/64`;
        const embed = new EmbedBuilder()
          .setTitle(`⛏️ Minecraft Player — ${profile.name}`).setColor(0x3dd68c)
          .setThumbnail(skinHead)
          .addFields(
            { name: '👤 Username', value: profile.name, inline: true },
            { name: '🆔 UUID',     value: `\`${formatted}\``, inline: false },
            { name: '✅ Account',  value: 'Valid Java Edition account', inline: true },
          )
          .setFooter({ text: 'Data from Mojang API' }).setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply(`❌ Could not look up **${username}**. The player may not exist or the Mojang API may be down.`);
      }
    }

    // ─── AFK ───
    if (interaction.commandName === 'afk') {
      const reason  = interaction.options.getString('reason') || 'AFK';
      const afkData = loadAFK();
      afkData[interaction.user.id] = { reason, username: interaction.user.username, since: Date.now() };
      saveAFK(afkData);
      return interaction.reply({ content: `💤 **${interaction.user.username}** is now AFK: *${reason}*` });
    }

    // ─── REMINDME ───
    if (interaction.commandName === 'remindme') {
      const timeStr = interaction.options.getString('time');
      const text    = interaction.options.getString('reminder');
      const ms      = parseDuration(timeStr);
      if (!ms) return interaction.reply({ content: '❌ Invalid time format. Use e.g. `30m`, `2h`, `1d`.', ephemeral: true });
      const fireAt    = Date.now() + ms;
      const reminders = loadReminders();
      reminders.push({ userId: interaction.user.id, text, fireAt });
      saveReminders(reminders);
      setTimeout(() => checkReminders(client), ms + 1000);
      return interaction.reply({
        content: `⏰ Got it! I'll remind you in **${timeStr}**: *${text}*\n> Reminder set for <t:${Math.floor(fireAt / 1000)}:F>`,
        ephemeral: true,
      });
    }

    // ─── BIRTHDAY ───
    if (interaction.commandName === 'birthday') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'set') {
        const day   = interaction.options.getInteger('day');
        const month = interaction.options.getInteger('month');
        if (day < 1 || day > 31 || month < 1 || month > 12)
          return interaction.reply({ content: '❌ Invalid date.', ephemeral: true });
        const birthdays = loadBirthdays();
        birthdays[interaction.user.id] = { day, month, username: interaction.user.tag };
        saveBirthdays(birthdays);
        return interaction.reply({ content: `🎂 Birthday set to **${day}/${month}**! The server will celebrate on your day.`, ephemeral: true });
      }
      if (sub === 'remove') {
        const birthdays = loadBirthdays();
        delete birthdays[interaction.user.id];
        saveBirthdays(birthdays);
        return interaction.reply({ content: '✅ Your birthday has been removed.', ephemeral: true });
      }
      if (sub === 'view') {
        const target    = interaction.options.getUser('user') || interaction.user;
        const birthdays = loadBirthdays();
        const data      = birthdays[target.id];
        if (!data) return interaction.reply({ content: `📋 **${target.username}** hasn't set a birthday yet.`, ephemeral: true });
        return interaction.reply({ content: `🎂 **${target.username}**'s birthday: **${data.day}/${data.month}**`, ephemeral: true });
      }
    }

    // ─── EMBED BUILDER ───
    if (interaction.commandName === 'embed') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      const title       = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color       = interaction.options.getString('color') || '#f0b429';
      const footer      = interaction.options.getString('footer');
      const imageUrl    = interaction.options.getString('image');
      const channel     = interaction.options.getChannel('channel') || interaction.channel;
      const colorInt    = parseInt(color.replace('#', ''), 16) || 0xf0b429;
      const embed = new EmbedBuilder()
        .setTitle(title || null)
        .setDescription(description || null)
        .setColor(colorInt);
      if (footer)   embed.setFooter({ text: footer });
      if (imageUrl) { try { embed.setImage(imageUrl); } catch { /* invalid URL */ } }
      embed.setTimestamp();
      try {
        await channel.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Embed posted in <#${channel.id}>!`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: '❌ Failed to send embed.', ephemeral: true });
      }
    }

    // ─── ROLE PANEL ───
    if (interaction.commandName === 'rolepanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      const title = interaction.options.getString('title') || '🎭 Self-Assign Roles';
      const desc  = interaction.options.getString('description') || 'Click a button below to add or remove a role.';
      const rolePairs = [];
      for (let i = 1; i <= 5; i++) {
        const role  = interaction.options.getRole(`role${i}`);
        const label = interaction.options.getString(`label${i}`);
        if (role && label) rolePairs.push({ role, label });
      }
      if (rolePairs.length === 0)
        return interaction.reply({ content: '❌ You must provide at least one role + label pair.', ephemeral: true });
      const buttons = rolePairs.map(({ role, label }) =>
        new ButtonBuilder().setCustomId(`role_toggle:${role.id}`).setLabel(label).setStyle(ButtonStyle.Secondary)
      );
      const row   = new ActionRowBuilder().addComponents(...buttons);
      const embed = new EmbedBuilder()
        .setTitle(title).setColor(0x5865f2).setDescription(desc)
        .setFooter({ text: 'Click to toggle a role' }).setTimestamp();
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ Role panel posted!', ephemeral: true });
    }
  }

  // ════════════════════════════════════════
  // SELECT MENU
  // ════════════════════════════════════════
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'apply_select') {
      const role   = interaction.values[0];
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
  }

  // ════════════════════════════════════════
  // BUTTONS
  // ════════════════════════════════════════
  if (interaction.isButton()) {

    // ── Book navigation ──
    if (interaction.customId.startsWith('book_prev:') || interaction.customId.startsWith('book_next:')) {
      const bookId = interaction.customId.split(':')[1];
      const book   = activeBooks.get(bookId);
      if (!book) return interaction.reply({ content: '❌ This book has expired. Please repost the rulebook.', ephemeral: true });
      const direction = interaction.customId.startsWith('book_prev:') ? -1 : 1;
      const newPage   = Math.max(0, Math.min(book.pages.length - 1, book.currentPage + direction));
      if (newPage === book.currentPage) return interaction.deferUpdate();
      book.currentPage = newPage;
      activeBooks.set(bookId, book);
      const embed = buildBookEmbed(book.bookTitle, book.pages, newPage, book.color);
      const row   = buildBookRow(newPage, book.pages.length, bookId);
      return interaction.update({ embeds: [embed], components: [row] });
    }

    // ── Verify ──
    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        return interaction.reply({ content: '✅ You are now verified!', ephemeral: true });
      } catch {
        return interaction.reply({ content: '❌ Failed to verify. Please contact a staff member.', ephemeral: true });
      }
    }

    // ── Role toggle ──
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

    // ── Ticket open ──
    if (interaction.customId === 'ticket_open') {
      const userId   = interaction.user.id;
      const tickets  = loadTickets();
      const existing = Object.values(tickets).find(t => t.userId === userId && !t.closed);
      if (existing) {
        return interaction.reply({ content: `❌ You already have an open ticket: <#${existing.channelId}>`, ephemeral: true });
      }
      try {
        const ticketNumber = Object.keys(tickets).length + 1;
        const ticketName   = `ticket-${ticketNumber.toString().padStart(4, '0')}`;
        const channel = await interaction.guild.channels.create({
          name:   ticketName,
          type:   ChannelType.GuildText,
          parent: TICKET_CATEGORY_ID || null,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...MOD_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
          ],
        });
        tickets[channel.id] = { userId, channelId: channel.id, ticketNumber, createdAt: new Date().toISOString(), closed: false, messages: [] };
        saveTickets(tickets);
        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ticket_close:${channel.id}`).setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
        );
        await channel.send({
          content: `<@${userId}> 👋 Welcome to your ticket! Describe your issue and a staff member will assist you shortly.\n\n<@&${MOD_ROLE_IDS[0]}> A new ticket has been opened.`,
          components: [closeRow],
        });
        return interaction.reply({ content: `✅ Ticket opened: <#${channel.id}>`, ephemeral: true });
      } catch (err) {
        console.error('Ticket open error:', err);
        return interaction.reply({ content: '❌ Failed to create ticket channel.', ephemeral: true });
      }
    }

    // ── Ticket close ──
    if (interaction.customId.startsWith('ticket_close:')) {
      const channelId = interaction.customId.split(':')[1];
      const tickets   = loadTickets();
      const ticket    = tickets[channelId];
      if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      if (!hasModPermission(interaction.member) && interaction.user.id !== ticket.userId)
        return interaction.reply({ content: '❌ Only staff or the ticket owner can close this.', ephemeral: true });
      await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
      try {
        const messages   = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m =>
          `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`
        ).join('\n');
        const logEmbed = new EmbedBuilder()
          .setTitle(`🎟️ Ticket Closed — #${interaction.channel.name}`).setColor(0xed4245)
          .addFields(
            { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Opened at', value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:F>`, inline: true },
          ).setTimestamp();
        const transcriptBuffer = Buffer.from(transcript, 'utf8');
        const attachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${interaction.channel.name}.txt` });
        const logCh = await client.channels.fetch(STAFF_LOG_CHANNEL);
        await logCh.send({ embeds: [logEmbed], files: [attachment] });
      } catch (err) { console.error('Transcript error:', err); }
      ticket.closed = true;
      saveTickets(tickets);
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    // ── Application accept/reject ──
    if (interaction.customId.startsWith('app_accept:')) {
      const [, role, userId, appId] = interaction.customId.split(':');
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('_noop_accept').setLabel('✅ Accepted').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('_noop_reject').setLabel('❌ Reject').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x3dd68c).setFooter({ text: `✅ Accepted by ${interaction.user.tag}` });
      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
      try { const member = await interaction.guild.members.fetch(userId); await member.roles.add(APP_ROLES[role]); } catch (err) { console.error('Could not assign role:', err); }
      try { const user = await client.users.fetch(userId); await user.send(`🎉 **Congratulations!**\n\nYour **${APP_NAMES[role]}** application (\`${appId}\`) has been **accepted**!\n\nYou've been given the role. Welcome to the team! 🏆\n\n*Reviewed by: ${interaction.user.tag}*`); } catch { /* DMs closed */ }
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
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0xe05c5c).setFooter({ text: `❌ Rejected by ${interaction.user.tag}` });
      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
      try { const user = await client.users.fetch(userId); await user.send(`📋 **Application Update**\n\nYour **${APP_NAMES[role]}** application (\`${appId}\`) has been **rejected** at this time.\n\nDon't be discouraged — you're welcome to apply again in the future! 💪\n\n*Reviewed by: ${interaction.user.tag}*`); } catch { /* DMs closed */ }
      return interaction.editReply({ content: `❌ Application **${appId}** rejected.` });
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// TICKET PANEL COMMAND
// ═══════════════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'ticketpanel') return;
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
    return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open').setLabel('🎟️ Open a Ticket').setStyle(ButtonStyle.Primary)
  );
  const embed = new EmbedBuilder()
    .setTitle('🎟️ Support Tickets').setColor(0x5865f2)
    .setDescription('Need help? Click the button below to open a private support ticket.\n\n> 📋 **Player reports**\n> ⚖️ **Ban appeals**\n> ❓ **General help**\n\nA staff member will assist you as soon as possible.')
    .setFooter({ text: 'GoldenHeart SMP — Support' }).setTimestamp();
  await interaction.channel.send({ embeds: [embed], components: [row] });
  return interaction.reply({ content: '✅ Ticket panel posted!', ephemeral: true });
});

// ═══════════════════════════════════════════════════════════════
// SLASH COMMAND REGISTRATION
// ═══════════════════════════════════════════════════════════════
const staffChoices = Object.entries(STAFF_MEMBERS).map(([key, info]) => ({ name: `${info.label} (${info.type})`, value: key }));

const commands = [
  new SlashCommandBuilder().setName('features').setDescription('See all features available to members'),
  new SlashCommandBuilder().setName('rules').setDescription('View the full server rules and warning system'),

  // ── Rulebooks ──
  new SlashCommandBuilder().setName('rulebook_mc').setDescription('📖 Browse the Minecraft Server Rules (paginated book)'),
  new SlashCommandBuilder().setName('rulebook_chat').setDescription('📖 Browse the Chat Rules (paginated book)'),
  new SlashCommandBuilder().setName('rulebook_general').setDescription('📖 Browse the General Rules, Warning System & Staff Rules (paginated book)'),

  new SlashCommandBuilder().setName('applypanel').setDescription('Send the staff application dropdown panel'),
  new SlashCommandBuilder().setName('announce').setDescription('Send announcement').addStringOption(o => o.setName('title').setDescription('Optional title').setRequired(false)),
  new SlashCommandBuilder().setName('verifypanel').setDescription('Send verification panel'),

  // ── Moderation ──
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

  new SlashCommandBuilder().setName('warn').setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  new SlashCommandBuilder().setName('unwarn').setDescription('Remove latest warn from a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

  new SlashCommandBuilder().setName('warnings').setDescription('Check warns for a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

  new SlashCommandBuilder().setName('clearwarns').setDescription('Clear ALL warns for a member (admin only)')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

  new SlashCommandBuilder().setName('serverinfo').setDescription('Show server stats and warn records'),

  // ── Feedback ──
  new SlashCommandBuilder().setName('feedback').setDescription('Rate a staff member — you\'ll receive a DM with the full staff list!'),

  new SlashCommandBuilder().setName('viewfeedback').setDescription('View feedback for staff members (mod only)')
    .addStringOption(o => o.setName('staff').setDescription('Specific staff member (leave blank for all)').setRequired(false).addChoices(...staffChoices)),

  new SlashCommandBuilder().setName('staffstats').setDescription('View full staff performance table (mod only)'),

  // ── Suggestions ──
  new SlashCommandBuilder().setName('suggest').setDescription('Submit a suggestion for the server')
    .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true)),

  new SlashCommandBuilder().setName('viewsuggestions').setDescription('View all suggestions (mod only)')
    .addStringOption(o =>
      o.setName('status').setDescription('Filter by status').setRequired(false)
        .addChoices(
          { name: 'All',         value: 'all' },
          { name: 'Pending',     value: 'pending' },
          { name: 'Accepted',    value: 'accepted' },
          { name: 'Denied',      value: 'denied' },
          { name: 'In Progress', value: 'in-progress' },
        )
    ),

  new SlashCommandBuilder().setName('suggestion').setDescription('Update the status of a suggestion (mod only)')
    .addStringOption(o => o.setName('id').setDescription('Suggestion ID e.g. SUG-ABC123').setRequired(true))
    .addStringOption(o =>
      o.setName('status').setDescription('New status').setRequired(true)
        .addChoices(
          { name: '✅ Accepted',    value: 'accepted' },
          { name: '❌ Denied',      value: 'denied' },
          { name: '🔄 In Progress', value: 'in-progress' },
          { name: '🟡 Pending',     value: 'pending' },
        )
    ),

  // ── Poll ──
  new SlashCommandBuilder().setName('poll').setDescription('Create a poll (mod only)')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option_a').setDescription('Option A').setRequired(true))
    .addStringOption(o => o.setName('option_b').setDescription('Option B').setRequired(true))
    .addStringOption(o => o.setName('option_c').setDescription('Option C').setRequired(false))
    .addStringOption(o => o.setName('option_d').setDescription('Option D').setRequired(false))
    .addIntegerOption(o => o.setName('duration').setDescription('Hours (default: 24)').setRequired(false).setMinValue(0).setMaxValue(168))
    .addIntegerOption(o => o.setName('minutes').setDescription('Extra minutes').setRequired(false).setMinValue(1).setMaxValue(59)),

  // ── Leveling ──
  new SlashCommandBuilder().setName('rank').setDescription('Check your XP rank (or another member\'s)')
    .addUserOption(o => o.setName('user').setDescription('Member to check (default: yourself)').setRequired(false)),

  new SlashCommandBuilder().setName('leaderboard').setDescription('View the top 10 most active members by XP'),

  // ── Giveaways ──
  new SlashCommandBuilder().setName('giveaway').setDescription('Giveaway management')
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Start a new giveaway')
        .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 30m, 2d').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default: 1)').setRequired(false).setMinValue(1).setMaxValue(10))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (default: current)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('reroll').setDescription('Reroll a giveaway winner')
        .addStringOption(o => o.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
    ),

  // ── Minecraft ──
  new SlashCommandBuilder().setName('serverstatus').setDescription('Check if the GoldenHeart SMP Minecraft server is online'),

  new SlashCommandBuilder().setName('mcplayer').setDescription('Look up a Minecraft player by username')
    .addStringOption(o => o.setName('username').setDescription('Minecraft username').setRequired(true)),

  // ── Tickets ──
  new SlashCommandBuilder().setName('ticketpanel').setDescription('Post the support ticket panel (admin only)'),

  // ── Utility ──
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
    .addSubcommand(sub =>
      sub.setName('set').setDescription('Set your birthday')
        .addIntegerOption(o => o.setName('day').setDescription('Day (1–31)').setRequired(true).setMinValue(1).setMaxValue(31))
        .addIntegerOption(o => o.setName('month').setDescription('Month (1–12)').setRequired(true).setMinValue(1).setMaxValue(12))
    )
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove your birthday'))
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View someone\'s birthday')
        .addUserOption(o => o.setName('user').setDescription('User to check (default: yourself)').setRequired(false))
    ),

  // ── FIXED: required options (role1, label1) come before non-required options ──
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

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.login(TOKEN).catch(err => console.error('❌ FAILED TO LOG IN TO DISCORD:', err));

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('Global commands cleared');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered (guild)');
  } catch (err) {
    console.error('❌ FAILED TO REGISTER SLASH COMMANDS:', err);
  }
})();

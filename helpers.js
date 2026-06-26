// ─────────────────────────────────────────
// HELPERS.JS - All helper functions for the bot
// ─────────────────────────────────────────

const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

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
// RULEBOOK FUNCTIONS
// ─────────────────────────────────────────
async function saveRulebooks(Rulebook, rulebooks) {
  for (const [key, book] of Object.entries(rulebooks)) {
    await Rulebook.findOneAndUpdate(
      { bookKey: key },
      { title: book.title, color: book.color, pages: book.pages },
      { upsert: true }
    );
  }
}

async function loadRulebooks(Rulebook) {
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

async function initializeRulebooks(Rulebook) {
  try {
    // Wait for MongoDB to be ready
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise(resolve => {
        if (mongoose.connection.readyState === 1) resolve();
        mongoose.connection.once('connected', resolve);
      });
    }
    
    const stored = await loadRulebooks(Rulebook);
    if (Object.keys(stored).length > 0) {
      RULEBOOKS = stored;
      console.log('✅ Rulebooks loaded from database');
    } else {
      await saveRulebooks(Rulebook, DEFAULT_RULEBOOKS);
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
// LOG HELPER
// ─────────────────────────────────────────
async function sendLog(client, embed, STAFF_LOG_CHANNEL) {
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
async function endGiveaway(client, giveaway, Giveaway, EmbedBuilder) {
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
async function checkBirthdays(client, Birthday, BIRTHDAY_CHANNEL_ID, BIRTHDAY_ROLE_ID, GUILD_ID) {
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
async function checkReminders(client, Reminder) {
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
async function checkTempBans(client, TempBan, sendLog, STAFF_LOG_CHANNEL) {
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
          await sendLog(client, logEmbed, STAFF_LOG_CHANNEL);
        }
      } catch { }
    }
  }
}

// ─────────────────────────────────────────
// XP/LEVELING CONFIG
// ─────────────────────────────────────────
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getLevelFromXP(totalXP) {
  let level = 0;
  while (xpForLevel(level + 1) <= totalXP) level++;
  return level;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getTimeoutDuration(warnCount) {
  if (warnCount < 3) return null;
  if (warnCount >= 8) return 28 * 24 * 60;
  return 30 + (warnCount - 3) * 15;
}

function hasModPermission(member, MOD_ROLE_IDS) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return MOD_ROLE_IDS.some(id => member.roles.cache.has(id));
}

function isGuildOwner(interaction) {
  return interaction.guild?.ownerId === interaction.user.id;
}

function isServerOwner(userId, SERVER_OWNER_ID) {
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
// EXPORT ALL FUNCTIONS
// ─────────────────────────────────────────
module.exports = {
  // Rulebook stuff
  DEFAULT_RULEBOOKS,
  RULEBOOKS,
  rulebooksLoaded,
  saveRulebooks,
  loadRulebooks,
  initializeRulebooks,
  
  // Core helpers
  sendLog,
  endGiveaway,
  checkBirthdays,
  checkReminders,
  checkTempBans,
  
  // XP/Leveling
  xpForLevel,
  getLevelFromXP,
  
  // General helpers
  getTimeoutDuration,
  hasModPermission,
  isGuildOwner,
  isServerOwner,
  autoDelete,
  starsDisplay,
  parseDuration,
  humanDuration,
  fetchJSON,
  getMCServerStatus,
  getOrdinal,
};

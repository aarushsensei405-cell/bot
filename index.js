const express = require('express');
const {
  Client,
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
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

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

const VERIFY_ROLE_ID = '1432277416109281371';
const MOD_ROLE_IDS   = ['1432277404864483390', '1432277404046331984'];

// Named staff members for feedback (username → Discord user ID)
const STAFF_MEMBERS = {
  gray:      { id: '935050795299250197',  label: 'Gray',       type: 'Chat Moderator' },
  mayehm:    { id: '750704207434088489',  label: 'Mayehm',     type: 'Helper' },
  iceflows:  { id: '1394287232029954108', label: 'IceFlows',   type: 'Helper' },
  mncikdb:   { id: '1092762008371339365', label: 'MNCIKDB',    type: 'MC Chat Moderator' },
  viking2001:{ id: '1215370954709008385', label: 'Viking2001',  type: 'MC Chat Moderator' },
};

// Role given on acceptance per application type
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

// ─────────────────────────────────────────
// FILE STORAGE HELPERS
// ─────────────────────────────────────────
const WARNS_FILE       = path.join(__dirname, 'warns.json');
const FEEDBACK_FILE    = path.join(__dirname, 'feedback.json');
const SUGGESTIONS_FILE = path.join(__dirname, 'suggestions.json');

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

// Active DM sessions: userId → { role, step, answers }
const activeSessions = new Map();

// ─────────────────────────────────────────
// FEEDBACK SESSION TRACKING
// pendingFeedback: userId → { staffKey, messageId, dmChannelId, awaitingComment }
// ─────────────────────────────────────────
const pendingFeedback = new Map();

// Star emojis used as reactions for rating
const STAR_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

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
function starsDisplay(n) {
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
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
  ],
  partials: ['CHANNEL', 'MESSAGE', 'REACTION'],
});

client.once('ready', () => console.log(`✅ ${client.user.tag} is online`));

// ═══════════════════════════════════════════════════════════════
// ██  SERVER EVENT LOGGING  ██
// ═══════════════════════════════════════════════════════════════

client.on('guildMemberAdd', async member => {
  if (member.guild.id !== GUILD_ID) return;
  const embed = new EmbedBuilder()
    .setTitle('📥 Member Joined')
    .setColor(0x57f287)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'User',    value: `<@${member.id}> (${member.user.tag})`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();
  await sendLog(client, embed);
});

client.on('guildMemberRemove', async member => {
  if (member.guild.id !== GUILD_ID) return;
  const embed = new EmbedBuilder()
    .setTitle('📤 Member Left')
    .setColor(0xed4245)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'User',   value: `${member.user.tag}`, inline: true },
      { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();
  await sendLog(client, embed);
});

client.on('messageDelete', async message => {
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (message.author?.bot) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Message Deleted')
    .setColor(0xfee75c)
    .addFields(
      { name: 'Author',  value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Unknown', inline: true },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      { name: 'Content', value: message.content?.slice(0, 1024) || '*[no text content]*', inline: false },
    )
    .setFooter({ text: `Message ID: ${message.id}` })
    .setTimestamp();
  await sendLog(client, embed);
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.guild.id !== GUILD_ID) return;
  if (oldMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;
  const embed = new EmbedBuilder()
    .setTitle('✏️ Message Edited')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Author',  value: `<@${oldMsg.author?.id}> (${oldMsg.author?.tag})`, inline: true },
      { name: 'Channel', value: `<#${oldMsg.channelId}>`, inline: true },
      { name: 'Before',  value: oldMsg.content?.slice(0, 512) || '*empty*', inline: false },
      { name: 'After',   value: newMsg.content?.slice(0, 512) || '*empty*', inline: false },
    )
    .setFooter({ text: `[Jump to message](${newMsg.url})` })
    .setTimestamp();
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
        { name: 'User', value: `${entry.target?.tag ?? 'Unknown'} (<@${entry.targetId}>)`, inline: true },
        { name: 'By',   value: `<@${entry.executorId}>`, inline: true },
        ...(isTimeout ? [{ name: 'Until', value: `<t:${Math.floor(new Date(timedOut.new).getTime() / 1000)}:F>`, inline: true }] : []),
        { name: 'Reason', value: entry.reason ?? 'No reason provided', inline: false },
      ).setTimestamp();
    await sendLog(client, embed);
  }

  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    const added   = entry.changes?.filter(c => c.key === '$add').flatMap(c => c.new) ?? [];
    const removed = entry.changes?.filter(c => c.key === '$remove').flatMap(c => c.new) ?? [];
    const lines   = [
      ...added.map(r   => `➕ <@&${r.id}> added`),
      ...removed.map(r => `➖ <@&${r.id}> removed`),
    ].join('\n');
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
    .addFields(
      { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
      ...fields,
    ).setTimestamp();
  await sendLog(client, embed);
});

// ═══════════════════════════════════════════════════════════════
// ██  REACTION HANDLER — star feedback  ██
// ═══════════════════════════════════════════════════════════════
client.on('messageReactionAdd', async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;

  // Fetch partial reaction/message if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  // Only care about DM reactions
  if (reaction.message.guild) return;

  const session = pendingFeedback.get(user.id);
  if (!session) return;

  // Make sure this reaction is on the right message
  if (reaction.message.id !== session.messageId) return;

  // Check if reaction is one of our number emojis
  const starIndex = STAR_EMOJIS.indexOf(reaction.emoji.name);
  if (starIndex === -1) return;

  const rating = starIndex + 1; // 1-5

  // Store rating, now await a comment
  session.rating   = rating;
  session.awaitingComment = true;
  pendingFeedback.set(user.id, session);

  // Ask for optional comment
  try {
    const dmChannel = reaction.message.channel;
    await dmChannel.send(
      `${starsDisplay(rating)} Got it — **${rating}/5** for **${STAFF_MEMBERS[session.staffKey].label}**!\n\n💬 **Optional:** Type a short comment about them, or type \`skip\` to submit now.`
    );
  } catch (err) {
    console.error('Could not send comment prompt:', err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ██  DM HANDLER — application flow + feedback comment  ██
// ═══════════════════════════════════════════════════════════════
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ── Guild auto-replies & auto-moderation ──
  if (message.guild) {
    const msg     = message.content.toLowerCase();
    const content = message.content;

    // ── Auto-mod: Cultural / country jokes → instant 1-day timeout ──
    const culturalPatterns = [
      /\b(country|nation|race|ethnic|culture|religion|caste)\s*(joke|meme|humor|banter)/i,
      /\b(indian|pakistani|chinese|american|african|arab|mexican|white|black|asian|jewish|muslim|hindu|christian)\s*(joke|meme|people are|folks are)/i,
      /\byou (indians?|pakistanis?|chinese|africans?|arabs?|mexicans?|whites?|blacks?|asians?)\b/i,
      /\ball (indians?|pakistanis?|chinese|africans?|arabs?|mexicans?|whites?|blacks?|asians?)\b/i,
      /\b(stereotype|stereotyping)\b.*\b(race|country|culture|nation|religion|ethnic)/i,
    ];

    const isCulturalJoke = culturalPatterns.some(p => p.test(content));

    if (isCulturalJoke) {
      try {
        await message.delete();
        // 1-day timeout = 24 * 60 * 60 * 1000 ms
        await message.member.timeout(24 * 60 * 60 * 1000, 'Severe violation: Cultural/country/race joke or remark');

        const warnEmbed = new EmbedBuilder()
          .setTitle('🚨 Severe Violation — Immediate Timeout')
          .setColor(0xff0000)
          .setDescription(
            `<@${message.author.id}>, your message was removed and you have been **timed out for 24 hours**.\n\n` +
            `> **Reason:** Jokes, stereotypes, or remarks targeting a country, culture, race, or religion are **strictly prohibited** on this server and are treated as a severe violation.\n\n` +
            `Further violations will result in an immediate ban.`
          )
          .setFooter({ text: 'GoldenHeart SMP — Zero Tolerance Policy' })
          .setTimestamp();

        await message.channel.send({ embeds: [warnEmbed] });

        // Log it
        const logEmbed = new EmbedBuilder()
          .setTitle('🚨 Auto-Mod: Cultural Joke — 1-Day Timeout')
          .setColor(0xff0000)
          .addFields(
            { name: 'User',    value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
            { name: 'Message', value: content.slice(0, 1024), inline: false },
          )
          .setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        console.error('Cultural joke auto-mod error:', err);
      }
      return;
    }

    // ── Auto-mod: Swearing AT a person (not about a situation) ──
    const personalSwearPatterns = [
      /\b(fuck|shit|bitch|bastard|asshole|ass hole|dick|cunt|idiot|moron|dumbass|retard)\s*(you|u|ur|your|him|her|them|he|she|they)\b/i,
      /\byou\s*(fucking?|fuckin|shit(ty)?|stupid|dumb|idiot|moron|bitch|asshole|dick|cunt|retard)\b/i,
      /\b(fuck|shit|bitch)\s+off\b/i,
    ];

    const isPersonalSwear = personalSwearPatterns.some(p => p.test(content));

    if (isPersonalSwear) {
      try {
        await message.delete();

        const warns  = loadWarns();
        const userId = message.author.id;
        if (!warns[userId]) warns[userId] = { username: message.author.tag, warns: [] };
        warns[userId].warns.push({
          reason:    'Using swear words directed at another person',
          warnedBy:  'AutoMod',
          timestamp: new Date().toISOString(),
        });
        saveWarns(warns);

        const warnCount   = warns[userId].warns.length;
        const timeoutMins = getTimeoutDuration(warnCount);

        if (timeoutMins) {
          try {
            await message.member.timeout(timeoutMins * 60 * 1000, `AutoMod Warn #${warnCount}: Swearing at a person`);
          } catch { /* bot role too low */ }
        }

        const warnEmbed = new EmbedBuilder()
          .setTitle('⚠️ Warning Issued — Personal Swearing')
          .setColor(0xffa500)
          .setDescription(
            `<@${message.author.id}>, your message was removed and you received **Warn #${warnCount}/8**.\n\n` +
            `> **Reason:** Using swear words directly at another person is **prohibited**.\n` +
            `> Swearing about a situation or comment is allowed — but never at someone.\n\n` +
            `${timeoutMins ? `⏱️ You have been timed out for **${timeoutMins} minutes**.` : '⚠️ Next warns will result in timeouts.'}`
          )
          .setFooter({ text: 'GoldenHeart SMP — Community Rules' })
          .setTimestamp();

        await message.channel.send({ embeds: [warnEmbed] });

        // Log it
        const logEmbed = new EmbedBuilder()
          .setTitle('⚠️ Auto-Mod: Personal Swear — Warn Issued')
          .setColor(0xffa500)
          .addFields(
            { name: 'User',     value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel',  value: `<#${message.channelId}>`, inline: true },
            { name: 'Warns',    value: `${warnCount}/8`, inline: true },
            { name: 'Message',  value: content.slice(0, 1024), inline: false },
          )
          .setTimestamp();
        await sendLog(client, logEmbed);
      } catch (err) {
        console.error('Personal swear auto-mod error:', err);
      }
      return;
    }

    if (msg === 'ip') {
      return message.reply(
        `💛 **GoldenHeart SMP** is now online!\n🌍 **IP:** \`goldenheartsmp.minecraftnoob.com:25565\`\n⚔️ Join now and start your journey!`
      );
    }
    if (msg === 'rules') {
      return message.reply(
        `📜 Use \`/rules\` to see the full server rules!\n\n📌 Or check: <#1432277447440597028>`
      );
    }
    if (msg === 'features') {
      return message.reply(`📋 Use \`/features\` to see everything you can do as a member!`);
    }
    return;
  }

  // ── DM: Feedback comment collection ──
  const userId = message.author.id;
  const fbSession = pendingFeedback.get(userId);
  if (fbSession?.awaitingComment) {
    pendingFeedback.delete(userId);

    const comment   = message.content.trim().toLowerCase() === 'skip' ? null : message.content.trim();
    const staffKey  = fbSession.staffKey;
    const staffInfo = STAFF_MEMBERS[staffKey];
    const rating    = fbSession.rating;

    // Save to file
    const feedbackData = loadFeedback();
    if (!feedbackData[staffKey]) feedbackData[staffKey] = { label: staffInfo.label, type: staffInfo.type, entries: [] };
    feedbackData[staffKey].entries.push({
      from:      message.author.tag,
      fromId:    message.author.id,
      rating,
      comment:   comment || '',
      timestamp: new Date().toISOString(),
    });
    saveFeedback(feedbackData);

    // DM the staff member
    try {
      const staffUser = await client.users.fetch(staffInfo.id);
      const dmEmbed = new EmbedBuilder()
        .setTitle('📬 You received new feedback!')
        .setColor(0xf0b429)
        .addFields(
          { name: 'Rating',  value: `${starsDisplay(rating)} (${rating}/5)`, inline: true },
          { name: 'From',    value: `Anonymous`,                              inline: true },
          { name: 'Comment', value: comment || '*No comment provided.*',     inline: false },
        )
        .setTimestamp();
      await staffUser.send({ embeds: [dmEmbed] });
    } catch {
      console.log(`Could not DM staff member ${staffInfo.label}`);
    }

    return message.channel.send(
      `✅ **Feedback submitted!**\n\n${starsDisplay(rating)} **(${rating}/5)** for **${staffInfo.label}** (${staffInfo.type})${comment ? `\n💬 *"${comment}"*` : ''}\n\nThank you for your feedback!`
    );
  }

  // ── DM: Application question flow ──
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

  // All answered
  activeSessions.delete(userId);

  const appId = 'APP-' + Date.now().toString(36).toUpperCase();
  const entry = {
    id: appId, userId,
    userTag: message.author.tag,
    role: session.role,
    submittedAt: new Date().toISOString(),
    answers: session.answers,
  };
  saveApp(session.role, entry);

  await message.channel.send(
    `✅ **Application submitted!**\n\nYour **${APP_NAMES[session.role]}** application has been received.\n📋 Application ID: \`${appId}\`\n\nYou'll receive a DM when the staff team has reviewed it. Thanks for applying!`
  );

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
    .setFooter({ text: `Role applied for: ${APP_NAMES[session.role]}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_accept:${session.role}:${userId}:${appId}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app_reject:${session.role}:${userId}:${appId}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger),
  );

  try {
    const logChannel = await client.channels.fetch(STAFF_LOG_CHANNEL);
    await logChannel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('Could not send to staff log:', err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ██  INTERACTION HANDLER  ██
// ═══════════════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {

    // ─── FEATURES ───
    if (interaction.commandName === 'features') {
      const embed = new EmbedBuilder()
        .setTitle('✨ GoldenHeart SMP — Member Features')
        .setColor(0xf0b429)
        .setDescription('Here\'s everything available to you as a member of GoldenHeart SMP!')
        .addFields(
          {
            name: '🔐 Verification',
            value: 'Click the **Verify** button in the verification channel to unlock full server access.',
            inline: false,
          },
          {
            name: '📋 Staff Applications',
            value: 'Want to join the team? Use the **Staff Application panel** to apply for:\n> 🛡️ Chat Moderator\n> 🤝 Helper\n> ⛏️ Minecraft Chat Moderator\n\nApplications are reviewed within **48 hours** and you\'ll be notified by DM.',
            inline: false,
          },
          {
            name: '⭐ Staff Feedback',
            value: 'Use `/feedback` to rate any staff member out of 5 stars. You\'ll get a DM with the full list — just react to pick who you want to rate. All feedback is **anonymous**.',
            inline: false,
          },
          {
            name: '💡 Suggestions',
            value: 'Have an idea for the server or the Minecraft world? Use `/suggest` to submit it. It will appear in the suggestions channel with **👍 / 👎** voting.',
            inline: false,
          },
          {
            name: '🌍 Minecraft Server',
            value: 'Type `ip` in any channel to get the **GoldenHeart SMP** Minecraft server IP instantly.\n> `goldenheartsmp.minecraftnoob.com:25565`',
            inline: false,
          },
          {
            name: '📜 Rules',
            value: 'Use `/rules` to view the full server rule set including the warning system, at any time.',
            inline: false,
          },
          {
            name: '🗳️ Polls',
            value: 'Staff may create polls in the server — react with the emoji letter to cast your vote!',
            inline: false,
          },
          {
            name: '📢 Announcements',
            value: 'Keep an eye on the announcements channel for server news, events, and updates.',
            inline: false,
          },
        )
        .setFooter({ text: 'GoldenHeart SMP — Glad to have you here! 💛' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ─── RULES ───
    if (interaction.commandName === 'rules') {
      const embed = new EmbedBuilder()
        .setTitle('📜 GoldenHeart SMP — Server Rules')
        .setColor(0xed4245)
        .setDescription('Please read all rules carefully. **"I didn\'t know" is not an excuse.**\nBreaking any rule will result in warnings or immediate action.')
        .addFields(
          {
            name: '🌍 Rule 1 — Cultural & Country Respect  🚨 SEVERE',
            value:
              'Jokes, memes, stereotypes, or remarks that mock or target any **country, culture, race, ethnicity, or religion** are **strictly prohibited**.\n\n' +
              '> ❌ This includes "harmless" jokes, banter, or ironic remarks.\n' +
              '> ❌ Targeting any nationality, religion, or ethnic group in any negative way.\n\n' +
              '**Punishment:** Message deleted + **immediate 24-hour timeout** — no prior warnings needed.\n' +
              '**Repeat offence:** Permanent ban.',
            inline: false,
          },
          {
            name: '🤬 Rule 2 — Swearing Policy',
            value:
              'Swearing is **allowed** when expressing a feeling, reacting to a situation, or in general comments.\n\n' +
              '> ✅ *"That was so damn unlucky!"* — allowed\n' +
              '> ✅ *"What the hell happened?!"* — allowed\n' +
              '> ❌ *"You\'re a stupid bitch"* — **NOT allowed**\n' +
              '> ❌ *"Fuck you / Fuck off [person]"* — **NOT allowed**\n\n' +
              '**Directing swear words at another person will result in 1 warn + timeout (see warning system below).**',
            inline: false,
          },
          {
            name: '🔇 Rule 3 — No Harassment or Hate',
            value: 'Harassment, threats, doxxing, or hate speech of any kind will not be tolerated. Staff will take immediate action.',
            inline: false,
          },
          {
            name: '🔞 Rule 4 — Keep It Appropriate',
            value: 'No NSFW content, graphic violence, or disturbing material anywhere in the server.',
            inline: false,
          },
          {
            name: '🔗 Rule 5 — No Spam or Self-Promotion',
            value: 'No spam, repeated messages, or unsolicited server/product promotion without staff permission.',
            inline: false,
          },
          {
            name: '🛡️ Rule 6 — Respect Staff',
            value: 'Follow staff instructions. Arguing with or disrespecting staff decisions publicly may result in additional warnings.',
            inline: false,
          },
          {
            name: '⚠️ Warning System — Warn → Timeout Table',
            value:
              '```\n' +
              'Warn 1  →  ⚠️  Warning only\n' +
              'Warn 2  →  ⚠️  Warning only\n' +
              'Warn 3  →  ⏱️  30-minute timeout\n' +
              'Warn 4  →  ⏱️  45-minute timeout\n' +
              'Warn 5  →  ⏱️  60-minute timeout\n' +
              'Warn 6  →  ⏱️  75-minute timeout\n' +
              'Warn 7  →  ⏱️  90-minute timeout\n' +
              'Warn 8  →  🔴  28-day (permanent) mute\n' +
              '```\n' +
              '> Each timeout increases by **+15 minutes** per warn from Warn 3 onwards.\n' +
              '> **Cultural/country jokes** apply a **direct 24-hour timeout** without using the warn counter.\n' +
              '> **Swearing at a person** costs **1 warn** and may trigger a timeout based on your current warn count.',
            inline: false,
          },
        )
        .setFooter({ text: 'GoldenHeart SMP — Breaking rules affects everyone. Be kind. 💛' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
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
        content: `📋 **Staff Applications**\n\nInterested in joining the team? Select a role below to start your application.\nYou'll receive the questions in your **DMs** — make sure they're open!\n\n> 🕐 Applications are reviewed within 48 hours.`,
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
        content: title
          ? `📢 Title set: **${title}**\n\nNow send your announcement message in chat.`
          : '📢 Send your announcement message in chat now.',
        ephemeral: true,
      });

      const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === interaction.user.id, max: 1, time: 60000,
      });
      collector.on('collect', async message => {
        const announcement = title
          ? `📢 @everyone\n\n━━━━━━━━━━━━━━━\n# **${title.toUpperCase()}**\n━━━━━━━━━━━━━━━\n\n${message.content}\n\n━━━━━━━━━━━━━━━`
          : `📢 @everyone\n\n${message.content}`;
        await interaction.channel.send({ content: announcement });
        await message.delete().catch(() => {});
      });
      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0)
          interaction.followUp({ content: '⏰ Timed out — no message received within 60 seconds.', ephemeral: true }).catch(() => {});
      });
    }

    // ─── VERIFY PANEL ───
    if (interaction.commandName === 'verifypanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: 'Admins only.', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify').setLabel('✅ Verify').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({
        content: `🔐 **Verification Required**\n\nClick the button below to verify yourself and gain access to the server.`,
        components: [row],
      });
      return interaction.reply({ content: 'Verify panel sent!', ephemeral: true });
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
          punishmentText = warnCount >= 8
            ? `\n⛔ **Permanently muted** (28-day timeout applied)`
            : `\n⏱️ **Timed out for ${timeoutMins} minutes**`;
        } catch {
          punishmentText = `\n⚠️ Could not apply timeout (check bot role position)`;
        }
      }

      return interaction.reply({
        content: `⚠️ **${target.user.tag}** has been warned.\n📋 **Reason:** ${reason}\n🔢 **Total warns:** ${warnCount}/8${punishmentText}${warnCount === 3 ? '\n> ⚠️ First timeout triggered at 3 warns.' : ''}${warnCount >= 8 ? '\n> 🔴 Max warns reached — permanent mute applied.' : ''}`,
      });
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

      const target  = interaction.options.getUser('user');
      const warns   = loadWarns();
      const userId  = target.id;

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

      const warns        = loadWarns();
      const warnedUsers  = Object.keys(warns).length;
      const totalWarns   = Object.values(warns).reduce((acc, u) => acc + u.warns.length, 0);

      const warnList = Object.entries(warns)
        .sort((a, b) => b[1].warns.length - a[1].warns.length)
        .slice(0, 10)
        .map(([uid, data], i) => `\`${i + 1}.\` <@${uid}> — **${data.warns.length}** warn(s)`)
        .join('\n') || 'No warns on record.';

      const embed = new EmbedBuilder()
        .setTitle(`📊 Server Info — ${guild.name}`)
        .setColor(0x5865f2)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👥 Total Members',   value: `${totalAll}`,      inline: true },
          { name: '🧑 Human Members',   value: `${totalMembers}`,  inline: true },
          { name: '🤖 Bots',            value: `${totalBots}`,     inline: true },
          { name: '🟢 Active (Online)', value: `${onlineMembers}`, inline: true },
          { name: '📅 Server Created',  value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: '👑 Owner',           value: `<@${guild.ownerId}>`, inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '⚠️ Total Warns Issued', value: `${totalWarns}`,  inline: true },
          { name: '👤 Warned Users',       value: `${warnedUsers}`, inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '📋 Top Warned Members (max 10)', value: warnList, inline: false },
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ═══════════════════════════════════════════════════════════════
    // ── FEEDBACK (NEW DM STAR REACTION FLOW) ──
    // ═══════════════════════════════════════════════════════════════
    if (interaction.commandName === 'feedback') {
      // Reply ephemerally so it stays in the server
      await interaction.reply({
        content: `📬 Check your **DMs** — I've sent you the staff list to rate!`,
        ephemeral: true,
      });

      // Build the staff list embed grouped by role type
      const typeOrder = ['Chat Moderator', 'Helper', 'MC Chat Moderator'];
      const grouped = {};
      for (const [key, info] of Object.entries(STAFF_MEMBERS)) {
        if (!grouped[info.type]) grouped[info.type] = [];
        grouped[info.type].push({ key, ...info });
      }

      // Build display lines per type
      const descriptionLines = [];
      for (const type of typeOrder) {
        if (!grouped[type]) continue;
        descriptionLines.push(`**━━ ${type}s ━━**`);
        for (const member of grouped[type]) {
          descriptionLines.push(`> **${member.label}** — React below with their number`);
        }
        descriptionLines.push('');
      }

      // Build the numbered member map for this DM message
      const staffList = Object.entries(STAFF_MEMBERS);

      // Create one line per staff member with their assigned number emoji
      const memberLines = staffList.map(([key, info], i) => {
        return `${STAR_EMOJIS[i]}  **${info.label}** — ${info.type}`;
      });

      const dmEmbed = new EmbedBuilder()
        .setTitle('⭐ Staff Feedback — Who do you want to rate?')
        .setColor(0xf0b429)
        .setDescription(
          `React with the **number** next to the staff member you'd like to rate!\n\n` +
          memberLines.join('\n') +
          `\n\n> After reacting, I'll ask for a **1–5 star rating** and an optional comment.`
        )
        .setFooter({ text: 'Your feedback is anonymous and sent directly to the staff member.' })
        .setTimestamp();

      let dmMsg;
      try {
        const dm = await interaction.user.createDM();

        // Send a picker message — which staff member?
        dmMsg = await dm.send({ embeds: [dmEmbed] });

        // Add number reactions (one per staff member, max 5 here)
        for (let i = 0; i < staffList.length && i < 5; i++) {
          await dmMsg.react(STAR_EMOJIS[i]);
        }

        // Store a "staff picker" pending session
        // We'll handle number emoji → staff member selection in reactionAdd
        pendingFeedback.set(interaction.user.id, {
          stage:     'pick_staff', // picking which staff member
          messageId: dmMsg.id,
          staffList, // ordered list for index lookup
        });

      } catch (err) {
        console.error('Could not DM user for feedback:', err);
        await interaction.followUp({
          content: `❌ I couldn't DM you! Please enable **Direct Messages** from server members in your Privacy Settings.`,
          ephemeral: true,
        });
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

        const avgRating = (data.entries.reduce((s, e) => s + e.rating, 0) / data.entries.length).toFixed(1);
        const recentList = data.entries.slice(-5).reverse().map((e, i) =>
          `**${i + 1}.** ${starsDisplay(e.rating)} — *"${e.comment || 'No comment'}"* *(${new Date(e.timestamp).toLocaleDateString()})*`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setTitle(`📋 Feedback — ${data.label} (${data.type})`)
          .setColor(0x5b8dee)
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
          .setTitle('📋 Staff Performance Overview')
          .setColor(0xf0b429)
          .setDescription(lines || 'No feedback data yet.')
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // ─── SUGGEST ───
    if (interaction.commandName === 'suggest') {
      const text   = interaction.options.getString('suggestion');
      const suggId = 'SUG-' + Date.now().toString(36).toUpperCase();
      saveSuggestion({ id: suggId, from: interaction.user.tag, fromId: interaction.user.id, text, timestamp: new Date().toISOString() });

      const embed = new EmbedBuilder()
        .setTitle('💡 New Suggestion')
        .setColor(0xf0b429)
        .setDescription(text)
        .addFields(
          { name: '👤 Submitted by', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🆔 Suggestion ID', value: `\`${suggId}\``,             inline: true },
        )
        .setFooter({ text: 'React below to vote!' })
        .setTimestamp();

      try {
        const ch  = await client.channels.fetch(SUGGESTIONS_CHANNEL_ID);
        const msg = await ch.send({ embeds: [embed] });
        await msg.react('👍');
        await msg.react('👎');
      } catch (err) {
        console.error('Could not post suggestion:', err);
      }

      return interaction.reply({ content: `✅ Your suggestion (\`${suggId}\`) has been submitted!`, ephemeral: true });
    }

    // ─── POLL ───
    if (interaction.commandName === 'poll') {
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });

      const question = interaction.options.getString('question');
      const durationHours   = interaction.options.getInteger('duration') || 0;
      const durationMinutes = interaction.options.getInteger('minutes') || 0;
      // Discord poll API requires duration in whole hours (minimum 1)
      // Convert minutes to fractional hours then ceil, with a floor of 1
      let duration = durationHours + (durationMinutes / 60);
      if (duration <= 0) duration = 24; // default 24h if nothing provided
      // Discord requires integer hours, so round up to nearest hour (min 1)
      const durationFinal = Math.max(1, Math.ceil(duration));
      // Human-readable label
      const durationLabel = durationHours > 0 && durationMinutes > 0
        ? `${durationHours}h ${durationMinutes}m`
        : durationMinutes > 0
          ? `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`
          : `${durationHours} hour${durationHours !== 1 ? 's' : ''}`;
      const optA     = interaction.options.getString('option_a');
      const optB     = interaction.options.getString('option_b');
      const optC     = interaction.options.getString('option_c');
      const optD     = interaction.options.getString('option_d');
      const rawOptions = [optA, optB, optC, optD].filter(Boolean);

      try {
        // Ping @everyone first
        await interaction.channel.send({ content: '@everyone 📊 A new poll is live — cast your vote!' });

        // Use Discord native Poll API (requires discord.js v14.16+ / API v10)
        const answers = rawOptions.map(text => ({ poll_media: { text } }));

        await interaction.rest.post(
          Routes.channelMessages(interaction.channelId),
          {
            body: {
              poll: {
                question:          { text: question },
                answers,
                duration: durationFinal,
                allow_multiselect: false,
              },
            },
          }
        );

        return interaction.reply({ content: '✅ Poll posted with @everyone ping!', ephemeral: true });

      } catch (err) {
        console.error('Native poll failed, falling back to embed poll:', err);

        // Fallback: embed + letter reactions
        const emojis      = ['🇦', '🇧', '🇨', '🇩'];
        const optionLines = rawOptions.map((o, i) => `${emojis[i]} **${o}**`).join('\n\n');

        const embed = new EmbedBuilder()
          .setTitle(`📊 ${question}`)
          .setColor(0x5865f2)
          .setDescription(optionLines)
          .addFields({ name: '🗳️ How to vote', value: 'React with the letter emoji for your choice!', inline: false })
          .setFooter({ text: `Poll by ${interaction.user.tag} • Closes in ${durationLabel}` })
          .setTimestamp();

        const pollMsg = await interaction.channel.send({ content: '@everyone', embeds: [embed] });
        for (let i = 0; i < rawOptions.length; i++) await pollMsg.react(emojis[i]);

        return interaction.reply({ content: '✅ Poll posted!', ephemeral: true });
      }
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

        await dm.send(
          `📋 **${APP_NAMES[role]} Application**\n\nHey **${interaction.user.username}**! Thanks for applying.\nAnswer each question by sending a message. Take your time — there's no timer.\n\nLet's start! 🚀\n\n${QUESTIONS[role][0].q}`
        );

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

    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        return interaction.reply({ content: '✅ You are now verified!', ephemeral: true });
      } catch {
        return interaction.reply({ content: '❌ Failed to verify. Please contact a staff member.', ephemeral: true });
      }
    }

    if (interaction.customId.startsWith('app_accept:')) {
      const [, role, userId, appId] = interaction.customId.split(':');
      if (!hasModPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('_noop_accept').setLabel('✅ Accepted').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('_noop_reject').setLabel('❌ Reject').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x3dd68c)
        .setFooter({ text: `✅ Accepted by ${interaction.user.tag}` });
      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(APP_ROLES[role]);
      } catch (err) { console.error('Could not assign role:', err); }

      try {
        const user = await client.users.fetch(userId);
        await user.send(`🎉 **Congratulations!**\n\nYour **${APP_NAMES[role]}** application (\`${appId}\`) has been **accepted**!\n\nYou've been given the role in the server. Welcome to the team! 🏆\n\n*Reviewed by: ${interaction.user.tag}*`);
      } catch { console.log('Could not DM applicant'); }

      return interaction.editReply({ content: `✅ Application **${appId}** accepted. Role assigned and applicant notified.` });
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
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0xe05c5c)
        .setFooter({ text: `❌ Rejected by ${interaction.user.tag}` });
      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

      try {
        const user = await client.users.fetch(userId);
        await user.send(`📋 **Application Update**\n\nUnfortunately, your **${APP_NAMES[role]}** application (\`${appId}\`) has been **rejected** at this time.\n\nDon't be discouraged — you're welcome to apply again in the future! Keep being active in the community. 💪\n\n*Reviewed by: ${interaction.user.tag}*`);
      } catch { console.log('Could not DM applicant'); }

      return interaction.editReply({ content: `❌ Application **${appId}** rejected. Applicant notified.` });
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// ██  REACTION HANDLER (updated — two-stage feedback)  ██
// ═══════════════════════════════════════════════════════════════
// We override the earlier simple handler with a two-stage one:
// Stage 1 — pick_staff: number emoji → which staff member
// Stage 2 — pick_rating: number emoji → star rating 1-5
client.removeAllListeners('messageReactionAdd'); // Remove the earlier listener we defined above

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  // DM only
  if (reaction.message.guild) return;

  const session = pendingFeedback.get(user.id);
  if (!session) return;
  if (reaction.message.id !== session.messageId) return;

  const emojiIndex = STAR_EMOJIS.indexOf(reaction.emoji.name);
  if (emojiIndex === -1) return;

  // ── Stage 1: pick which staff member ──
  if (session.stage === 'pick_staff') {
    const staffList = session.staffList;
    if (emojiIndex >= staffList.length) return;

    const [staffKey, staffInfo] = staffList[emojiIndex];

    // Now send a star rating message
    const ratingEmbed = new EmbedBuilder()
      .setTitle(`⭐ Rate ${staffInfo.label}`)
      .setColor(0xf0b429)
      .setDescription(
        `You selected **${staffInfo.label}** (${staffInfo.type}).\n\n` +
        `React with a number to give your rating:\n\n` +
        `1️⃣ ⭐ — Poor\n` +
        `2️⃣ ⭐⭐ — Fair\n` +
        `3️⃣ ⭐⭐⭐ — Good\n` +
        `4️⃣ ⭐⭐⭐⭐ — Great\n` +
        `5️⃣ ⭐⭐⭐⭐⭐ — Excellent`
      )
      .setFooter({ text: 'React with 1️⃣ through 5️⃣ to rate.' })
      .setTimestamp();

    try {
      const dm      = reaction.message.channel;
      const rateMsg = await dm.send({ embeds: [ratingEmbed] });

      // Add 1-5 reactions
      for (const emoji of STAR_EMOJIS) await rateMsg.react(emoji);

      // Update session to stage 2
      pendingFeedback.set(user.id, {
        stage:     'pick_rating',
        staffKey,
        messageId: rateMsg.id,
      });
    } catch (err) {
      console.error('Could not send rating message:', err);
    }
    return;
  }

  // ── Stage 2: pick star rating ──
  if (session.stage === 'pick_rating') {
    const rating   = emojiIndex + 1; // 1-5
    const staffKey = session.staffKey;

    // Move to comment stage
    pendingFeedback.set(user.id, {
      stage:          'await_comment',
      staffKey,
      rating,
      awaitingComment: true,
      messageId:       session.messageId,
    });

    try {
      const dm = reaction.message.channel;
      await dm.send(
        `${starsDisplay(rating)} Got it — **${rating}/5** for **${STAFF_MEMBERS[staffKey].label}**!\n\n` +
        `💬 **Optional:** Type a comment about them, or type \`skip\` to submit now.`
      );
    } catch (err) {
      console.error('Could not send comment prompt:', err);
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// ██  SLASH COMMAND REGISTRATION  ██
// ═══════════════════════════════════════════════════════════════
const staffChoices = Object.entries(STAFF_MEMBERS).map(([key, info]) => ({
  name: `${info.label} (${info.type})`,
  value: key,
}));

const commands = [

  new SlashCommandBuilder()
    .setName('features')
    .setDescription('See all features available to members'),

  new SlashCommandBuilder()
    .setName('rules')
    .setDescription('View the full server rules and warning system'),

  new SlashCommandBuilder()
    .setName('applypanel')
    .setDescription('Send the staff application dropdown panel'),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send announcement')
    .addStringOption(o => o.setName('title').setDescription('Optional title').setRequired(false)),

  new SlashCommandBuilder()
    .setName('verifypanel')
    .setDescription('Send verification panel'),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove latest warn from a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warns for a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear ALL warns for a member (admin only)')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show server stats: total members, bots, active users & all warn records'),

  // ── FEEDBACK: no options — all done via DM reactions ──
  new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Rate a staff member — you\'ll receive a DM with the full staff list!'),

  new SlashCommandBuilder()
    .setName('viewfeedback')
    .setDescription('View feedback for staff members (mod only)')
    .addStringOption(o =>
      o.setName('staff').setDescription('Specific staff member (leave blank for all)').setRequired(false)
        .addChoices(...staffChoices)
    ),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for the server')
    .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll (mod only)')
    .addStringOption(o => o.setName('question').setDescription('Poll heading/question').setRequired(true))
    .addStringOption(o => o.setName('option_a').setDescription('Option A').setRequired(true))
    .addStringOption(o => o.setName('option_b').setDescription('Option B').setRequired(true))
    .addStringOption(o => o.setName('option_c').setDescription('Option C').setRequired(false))
    .addStringOption(o => o.setName('option_d').setDescription('Option D').setRequired(false))
    .addIntegerOption(o => o.setName('duration').setDescription('Hours the poll runs (default: 24h if neither is set)').setRequired(false).setMinValue(0).setMaxValue(168))
    .addIntegerOption(o => o.setName('minutes').setDescription('Extra minutes on top of hours (e.g. 30 = 30 extra mins)').setRequired(false).setMinValue(1).setMaxValue(59)),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('Global commands cleared');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered (guild)');
    client.login(TOKEN);
  } catch (err) {
    console.error(err);
  }
})();

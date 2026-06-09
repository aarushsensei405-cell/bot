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
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────
// EXPRESS (keep-alive for Render)
// ─────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const TOKEN     = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID  = '1432272831722553398';

const STAFF_LOG_CHANNEL = '1432277470878498866';

const VERIFY_ROLE_ID = '1432277416109281371';
const MOD_ROLE_IDS   = ['1432277404864483390', '1432277404046331984'];

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
// WARNS STORAGE
// ─────────────────────────────────────────
const WARNS_FILE = path.join(__dirname, 'warns.json');

function loadWarns() {
  try { return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveWarns(data) {
  fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────
// APPLICATIONS STORAGE
// ─────────────────────────────────────────
const APP_FILES = {
  chatmod: path.join(__dirname, 'applicationforchatmod.json'),
  helper:  path.join(__dirname, 'applicationforhelper.json'),
  mcmod:   path.join(__dirname, 'applicationforminecraftchatmod.json'),
};

function loadApps(role) {
  try { return JSON.parse(fs.readFileSync(APP_FILES[role], 'utf8')); }
  catch { return []; }
}
function saveApp(role, entry) {
  const apps = loadApps(role);
  apps.push(entry);
  fs.writeFileSync(APP_FILES[role], JSON.stringify(apps, null, 2));
}

// Active DM sessions: userId -> { role, step, answers }
const activeSessions = new Map();

// ─────────────────────────────────────────
// APPLICATION QUESTIONS PER ROLE
// ─────────────────────────────────────────
const QUESTIONS = {
  chatmod: [
    { key: 'discord',   q: '**[1/6]** What is your Discord username?' },
    { key: 'age',       q: '**[2/6]** How old are you?' },
    { key: 'timezone',  q: '**[3/6]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours',     q: '**[4/6]** How many hours per day can you be active?' },
    { key: 'why',       q: '**[5/6]** Why do you want to be a **Chat Moderator**? *(min 50 chars)*' },
    { key: 'scenario',  q: '**[6/6]** A player is spamming slurs in chat. What do you do?' },
  ],
  helper: [
    { key: 'discord',   q: '**[1/6]** What is your Discord username?' },
    { key: 'age',       q: '**[2/6]** How old are you?' },
    { key: 'timezone',  q: '**[3/6]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours',     q: '**[4/6]** How many hours per day can you be active?' },
    { key: 'why',       q: '**[5/6]** Why do you want to be a **Helper**? *(min 50 chars)*' },
    { key: 'experience',q: '**[6/6]** Do you have any previous experience helping on servers?' },
  ],
  mcmod: [
    { key: 'discord',   q: '**[1/7]** What is your Discord username?' },
    { key: 'mcuser',    q: '**[2/7]** What is your Minecraft username?' },
    { key: 'age',       q: '**[3/7]** How old are you?' },
    { key: 'timezone',  q: '**[4/7]** What is your timezone? *(e.g. UTC+5:30, EST, GMT)*' },
    { key: 'hours',     q: '**[5/7]** How many hours per day can you be active on the MC server?' },
    { key: 'why',       q: '**[6/7]** Why do you want to be a **Minecraft Chat Moderator**? *(min 50 chars)*' },
    { key: 'scenario',  q: '**[7/7]** A player is using a hack client and spamming chat. What do you do?' },
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

// ─────────────────────────────────────────
// CLIENT
// ─────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL'],
});

client.once('ready', () => console.log(`${client.user.tag} is online`));

// ─────────────────────────────────────────
// DM HANDLER — collect application answers
// ─────────────────────────────────────────
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ── Auto replies (guild only) ──
  if (message.guild) {
    const msg = message.content.toLowerCase();
    if (msg === 'ip') {
      return message.reply(
💛 **GoldenHeart SMP** is now online!
🌍 **IP:** `goldenheartsmp.minecraftnoob.com:25565`
⚔️ Join now and start your journey!

      );
    }
    if (msg === 'rules') {
      return message.reply(
📜 **Rules Reminder:**

Please read the rules before playing. Breaking rules can result in warnings or bans.

📌 Check: <#1432277447440597028> 

**“I didn’t know” is not an excuse.**
      );
    }
    return;
  }

  // ── DM application flow ──
  const userId = message.author.id;
  const session = activeSessions.get(userId);
  if (!session) return;

  const questions = QUESTIONS[session.role];
  const currentQ  = questions[session.step];

  // Validate 'why' answer length
  if (currentQ.key === 'why' && message.content.trim().length < 50) {
    return message.channel.send('⚠️ Please write at least 50 characters for this answer. Try again:');
  }

  // Save answer
  session.answers[currentQ.key] = message.content.trim();
  session.step++;

  // More questions?
  if (session.step < questions.length) {
    return message.channel.send(questions[session.step].q);
  }

  // ── All answered — save + send to staff log ──
  activeSessions.delete(userId);

  const appId = 'APP-' + Date.now().toString(36).toUpperCase();
  const entry = {
    id: appId,
    userId,
    userTag: message.author.tag,
    role: session.role,
    submittedAt: new Date().toISOString(),
    answers: session.answers,
  };

  saveApp(session.role, entry);

  // Confirm to applicant
  await message.channel.send(
`✅ **Application submitted!**

Your **${APP_NAMES[session.role]}** application has been received.
📋 Application ID: \`${appId}\`

You'll receive a DM when the staff team has reviewed it. Thanks for applying!`
  );

  // Build embed for staff log
  const embed = new EmbedBuilder()
    .setTitle(`📋 New Application — ${APP_NAMES[session.role]}`)
    .setColor(session.role === 'chatmod' ? 0xf0b429 : session.role === 'helper' ? 0x5b8dee : 0x3dd68c)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Applicant', value: `<@${userId}> (${message.author.tag})`, inline: true },
      { name: '🆔 App ID',    value: `\`${appId}\``,                          inline: true },
      { name: '📅 Submitted', value: `<t:${Math.floor(Date.now()/1000)}:F>`,  inline: false },
      ...Object.entries(session.answers).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v.length > 1024 ? v.slice(0, 1021) + '...' : v,
        inline: false,
      }))
    )
    .setFooter({ text: `Role applied for: ${APP_NAMES[session.role]}` })
    .setTimestamp();

  // Accept / Reject buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`app_accept:${session.role}:${userId}:${appId}`)
      .setLabel('✅ Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`app_reject:${session.role}:${userId}:${appId}`)
      .setLabel('❌ Reject')
      .setStyle(ButtonStyle.Danger),
  );

  try {
    const logChannel = await client.channels.fetch(STAFF_LOG_CHANNEL);
    await logChannel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('Could not send to staff log:', err);
  }
});

// ─────────────────────────────────────────
// INTERACTION HANDLER
// ─────────────────────────────────────────
client.on('interactionCreate', async interaction => {

  // ══════════════════════════════════════
  // SLASH COMMANDS
  // ══════════════════════════════════════
  if (interaction.isChatInputCommand()) {

    // ── APPLY PANEL ──
    if (interaction.commandName === 'applypanel') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      }

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('apply_select')
          .setPlaceholder('📋 Select a role to apply for...')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('🛡️ Chat Moderator')
              .setDescription('Apply to moderate the Discord server')
              .setValue('chatmod'),
            new StringSelectMenuOptionBuilder()
              .setLabel('🤝 Helper')
              .setDescription('Apply to help and support members')
              .setValue('helper'),
            new StringSelectMenuOptionBuilder()
              .setLabel('⛏️ Minecraft Chat Moderator')
              .setDescription('Apply to moderate in-game chat')
              .setValue('mcmod'),
          )
      );

      await interaction.channel.send({
        content:
`📋 **Staff Applications**

Interested in joining the team? Select a role below to start your application.
You'll receive the questions in your **DMs** — make sure they're open!

> 🕐 Applications are reviewed within 48 hours.`,
        components: [menu],
      });

      return interaction.reply({ content: '✅ Application panel sent!', ephemeral: true });
    }

    // ── ANNOUNCE ──
    if (interaction.commandName === 'announce') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Only admins can use this command.', ephemeral: true });
      }

      const title = interaction.options.getString('title');
      await interaction.reply({
        content: title
          ? `📢 Title set: **${title}**\n\nNow send your announcement message in chat.`
          : '📢 Send your announcement message in chat now.',
        ephemeral: true,
      });

      const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === interaction.user.id,
        max: 1, time: 60000,
      });

      collector.on('collect', async message => {
        const announcement = title
          ? `📢 @everyone\n\n━━━━━━━━━━━━━━━\n# **${title.toUpperCase()}**\n━━━━━━━━━━━━━━━\n\n${message.content}\n\n━━━━━━━━━━━━━━━`
          : `📢 @everyone\n\n${message.content}`;
        await interaction.channel.send({ content: announcement });
        await message.delete().catch(() => {});
      });
    }

    // ── VERIFY PANEL ──
    if (interaction.commandName === 'verifypanel') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Admins only.', ephemeral: true });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify').setLabel('✅ Verify').setStyle(ButtonStyle.Success)
      );

      await interaction.channel.send({
        content: `🔐 **Verification Required**\n\nClick the button below to verify yourself and gain access to the server.`,
        components: [row],
      });

      return interaction.reply({ content: 'Verify panel sent!', ephemeral: true });
    }

    // ── WARN ──
    if (interaction.commandName === 'warn') {

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({ content: '❌ You do not have permission to warn members.', ephemeral: true });
      }

      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!target)  return interaction.reply({ content: '❌ User not found.', ephemeral: true });
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
        content:
`⚠️ **${target.user.tag}** has been warned.
📋 **Reason:** ${reason}
🔢 **Total warns:** ${warnCount}/8${punishmentText}
${warnCount === 3 ? '\n> ⚠️ First timeout triggered at 3 warns.' : ''}
${warnCount >= 8  ? '\n> 🔴 Max warns reached — permanent mute applied.' : ''}`,
      });
    }

    // ── UNWARN ──
    if (interaction.commandName === 'unwarn') {

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      const warns  = loadWarns();
      const userId = target.id;

      if (!warns[userId] || warns[userId].warns.length === 0) {
        return interaction.reply({ content: `✅ **${target.tag}** has no warns.`, ephemeral: true });
      }

      warns[userId].warns.pop();
      if (warns[userId].warns.length === 0) delete warns[userId];
      saveWarns(warns);

      return interaction.reply({
        content: `✅ Removed latest warn from **${target.tag}**.\n🔢 **Remaining warns:** ${warns[userId]?.warns.length ?? 0}`,
      });
    }

    // ── WARNINGS ──
    if (interaction.commandName === 'warnings') {

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      }

      const target  = interaction.options.getUser('user');
      const warns   = loadWarns();
      const userId  = target.id;

      if (!warns[userId] || warns[userId].warns.length === 0) {
        return interaction.reply({ content: `✅ **${target.tag}** has no warns.`, ephemeral: true });
      }

      const list = warns[userId].warns.map((w, i) => {
        const date = new Date(w.timestamp).toLocaleDateString();
        return `**#${i + 1}** — ${w.reason} *(by ${w.warnedBy} on ${date})*`;
      }).join('\n');

      const warnCount   = warns[userId].warns.length;
      const nextTimeout = getTimeoutDuration(warnCount + 1);

      return interaction.reply({
        content:
`📋 **Warns for ${target.tag}** — ${warnCount}/8

${list}

${nextTimeout ? `⏭️ Next warn → **${nextTimeout}-min timeout**` : warnCount >= 8 ? '🔴 Max warns reached' : ''}`,
        ephemeral: true,
      });
    }

    // ── CLEARWARNS ──
    if (interaction.commandName === 'clearwarns') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      const warns  = loadWarns();
      delete warns[target.id];
      saveWarns(warns);

      return interaction.reply({ content: `🧹 Cleared all warns for **${target.tag}**.` });
    }
  }

  // ══════════════════════════════════════
  // SELECT MENU — Application dropdown
  // ══════════════════════════════════════
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'apply_select') {

      const role   = interaction.values[0];
      const userId = interaction.user.id;

      // Don't allow double applications
      if (activeSessions.has(userId)) {
        return interaction.reply({
          content: '⚠️ You already have an application in progress in your DMs! Please finish or ignore it first.',
          ephemeral: true,
        });
      }

      // Try to open DM
      try {
        const dm = await interaction.user.createDM();

        activeSessions.set(userId, { role, step: 0, answers: {} });

        await dm.send(
`📋 **${APP_NAMES[role]} Application**

Hey **${interaction.user.username}**! Thanks for applying.
Answer each question by sending a message. Take your time — there's no timer.

Let's start! 🚀

${QUESTIONS[role][0].q}`
        );

        return interaction.reply({
          content: `✅ Application started! Check your **DMs** to continue.`,
          ephemeral: true,
        });

      } catch {
        return interaction.reply({
          content: `❌ I couldn't DM you! Please enable **Direct Messages** from server members in your Privacy Settings and try again.`,
          ephemeral: true,
        });
      }
    }
  }

  // ══════════════════════════════════════
  // BUTTONS
  // ══════════════════════════════════════
  if (interaction.isButton()) {

    // ── VERIFY ──
    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        return interaction.reply({ content: '✅ You are now verified!', ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ Failed to verify.', ephemeral: true });
      }
    }

    // ── ACCEPT APPLICATION ──
    if (interaction.customId.startsWith('app_accept:')) {
      const [, role, userId, appId] = interaction.customId.split(':');

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      }

      // Disable buttons on the log message
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('_accepted').setLabel('✅ Accepted').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('_rej').setLabel('❌ Reject').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      await interaction.message.edit({ components: [disabledRow] });

      // Give role
      try {
        const guild  = interaction.guild;
        const member = await guild.members.fetch(userId);
        await member.roles.add(APP_ROLES[role]);
      } catch (err) {
        console.error('Could not assign role:', err);
      }

      // DM applicant
      try {
        const user = await client.users.fetch(userId);
        await user.send(
`🎉 **Congratulations!**

Your **${APP_NAMES[role]}** application (\`${appId}\`) has been **accepted**!

You've been given the role in the server. Welcome to the team! 🏆

*Reviewed by: ${interaction.user.tag}*`
        );
      } catch {
        console.log('Could not DM applicant');
      }

      // Update embed color to green
      const oldEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0x3dd68c)
        .setFooter({ text: `✅ Accepted by ${interaction.user.tag}` });
      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

      return interaction.reply({ content: `✅ Application **${appId}** accepted. Role assigned and applicant notified.`, ephemeral: true });
    }

    // ── REJECT APPLICATION ──
    if (interaction.customId.startsWith('app_reject:')) {
      const [, role, userId, appId] = interaction.customId.split(':');

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });
      }

      // Disable buttons
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('_acc').setLabel('✅ Accept').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('_rejected').setLabel('❌ Rejected').setStyle(ButtonStyle.Danger).setDisabled(true),
      );

      // DM applicant
      try {
        const user = await client.users.fetch(userId);
        await user.send(
`📋 **Application Update**

Unfortunately, your **${APP_NAMES[role]}** application (\`${appId}\`) has been **rejected** at this time.

Don't be discouraged — you're welcome to apply again in the future! Keep being active in the community. 💪

*Reviewed by: ${interaction.user.tag}*`
        );
      } catch {
        console.log('Could not DM applicant');
      }

      // Update embed color to red
      const oldEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0xe05c5c)
        .setFooter({ text: `❌ Rejected by ${interaction.user.tag}` });
      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

      return interaction.reply({ content: `❌ Application **${appId}** rejected. Applicant notified.`, ephemeral: true });
    }
  }
});

// ─────────────────────────────────────────
// SLASH COMMANDS REGISTRATION
// ─────────────────────────────────────────
const commands = [

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

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('Global commands cleared');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash commands registered (guild)');
    client.login(TOKEN);
  } catch (err) {
    console.error(err);
  }
})();

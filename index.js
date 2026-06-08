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
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Render port fix
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is online!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1432272831722553398';

// Role IDs
const VERIFY_ROLE_ID = '1432277416109281371';
const MOD_ROLE_IDS = [
  '1432277404864483390',
  '1432277404046331984'
];

// Warns storage
const WARNS_FILE = path.join(__dirname, 'warns.json');

function loadWarns() {
  try {
    return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveWarns(data) {
  fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
}

// Timeout durations per warn count (in minutes)
// Warn 1-2 = no timeout
// Warn 3 = 30 min, each warn after adds 15 min
// Warn 8+ = permanent mute (28 days, Discord max)
function getTimeoutDuration(warnCount) {
  if (warnCount < 3) return null;
  if (warnCount >= 8) return 28 * 24 * 60;
  return 30 + (warnCount - 3) * 15;
}

function hasModPermission(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return MOD_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`${client.user.tag} is online`);
});

// AUTO REPLIES
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  if (msg === 'ip') {
    return message.reply(
`🚧 **The server IP has not been released yet!**

We're almost there — the IP will be shared here very soon. Stay tuned and keep an eye on this channel so you don't miss it!`
    );
  }

  if (msg === 'rules') {
    return message.reply(
`📜 **Rules Are Being Forged...**

⚒️ Our official server rules are currently being updated to make the experience fair, fun, and balanced for everyone.

🚧 **Rules will be released very soon!**

Until then:
✅ Use common sense  
✅ Respect all players & staff  
✅ Avoid unfair advantages or exploits

👀 Keep an eye on announcements — the full rulebook is coming soon!`
    );
  }
});

// INTERACTIONS
client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {

    // ANNOUNCE
    if (interaction.commandName === 'announce') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: 'Only admins can use this command.',
          ephemeral: true
        });
      }

      const title = interaction.options.getString('title');

      await interaction.reply({
        content: title
          ? `📢 Title set: **${title}**\n\nNow send your announcement message in chat.`
          : '📢 Send your announcement message in chat now.',
        ephemeral: true
      });

      const filter = m => m.author.id === interaction.user.id;
      const collector = interaction.channel.createMessageCollector({
        filter,
        max: 1,
        time: 60000
      });

      collector.on('collect', async message => {
        let announcement;

        if (title) {
          announcement =
`📢 @everyone

━━━━━━━━━━━━━━━
# **${title.toUpperCase()}**
━━━━━━━━━━━━━━━

${message.content}

━━━━━━━━━━━━━━━`;
        } else {
          announcement =
`📢 @everyone

${message.content}`;
        }

        await interaction.channel.send({ content: announcement });
        await message.delete().catch(() => {});
      });
    }

    // VERIFY PANEL
    if (interaction.commandName === 'verifypanel') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Admins only.', ephemeral: true });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify')
          .setLabel('✅ Verify')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.channel.send({
        content:
`🔐 **Verification Required**

Click the button below to verify yourself and gain access to the server.`,
        components: [row]
      });

      return interaction.reply({ content: 'Verify panel sent!', ephemeral: true });
    }

    // WARN
    if (interaction.commandName === 'warn') {

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({
          content: '❌ You do not have permission to warn members.',
          ephemeral: true
        });
      }

      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!target) {
        return interaction.reply({ content: '❌ User not found.', ephemeral: true });
      }

      if (target.user.bot) {
        return interaction.reply({ content: '❌ You cannot warn a bot.', ephemeral: true });
      }

      if (target.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You cannot warn an admin.', ephemeral: true });
      }

      const warns = loadWarns();
      const userId = target.user.id;

      if (!warns[userId]) {
        warns[userId] = { username: target.user.tag, warns: [] };
      }

      warns[userId].warns.push({
        reason,
        warnedBy: interaction.user.tag,
        timestamp: new Date().toISOString()
      });

      saveWarns(warns);

      const warnCount = warns[userId].warns.length;
      const timeoutMins = getTimeoutDuration(warnCount);

      let punishmentText = '';

      if (timeoutMins) {
        try {
          const ms = timeoutMins * 60 * 1000;
          await target.timeout(ms, `Warn #${warnCount}: ${reason}`);

          if (warnCount >= 8) {
            punishmentText = `\n⛔ **Permanently muted** (28-day timeout applied)`;
          } else {
            punishmentText = `\n⏱️ **Timed out for ${timeoutMins} minutes**`;
          }
        } catch {
          punishmentText = `\n⚠️ Could not apply timeout (check bot role position)`;
        }
      }

      return interaction.reply({
        content:
`⚠️ **${target.user.tag}** has been warned.
📋 **Reason:** ${reason}
🔢 **Total warns:** ${warnCount}/8${punishmentText}

${warnCount === 3 ? '> ⚠️ First timeout triggered at 3 warns.' : ''}
${warnCount >= 8 ? '> 🔴 Max warns reached — permanent mute applied.' : ''}`
      });
    }

    // UNWARN
    if (interaction.commandName === 'unwarn') {

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({
          content: '❌ You do not have permission to remove warns.',
          ephemeral: true
        });
      }

      const target = interaction.options.getUser('user');
      const userId = target.id;
      const warns = loadWarns();

      if (!warns[userId] || warns[userId].warns.length === 0) {
        return interaction.reply({
          content: `✅ **${target.tag}** has no warns to remove.`,
          ephemeral: true
        });
      }

      warns[userId].warns.pop();

      if (warns[userId].warns.length === 0) {
        delete warns[userId];
      }

      saveWarns(warns);

      const remaining = warns[userId]?.warns.length ?? 0;

      return interaction.reply({
        content:
`✅ Removed the latest warn from **${target.tag}**.
🔢 **Remaining warns:** ${remaining}`
      });
    }

    // WARNINGS
    if (interaction.commandName === 'warnings') {

      if (!hasModPermission(interaction.member)) {
        return interaction.reply({
          content: '❌ You do not have permission to view warns.',
          ephemeral: true
        });
      }

      const target = interaction.options.getUser('user');
      const userId = target.id;
      const warns = loadWarns();

      if (!warns[userId] || warns[userId].warns.length === 0) {
        return interaction.reply({
          content: `✅ **${target.tag}** has no warns.`,
          ephemeral: true
        });
      }

      const list = warns[userId].warns.map((w, i) => {
        const date = new Date(w.timestamp).toLocaleDateString();
        return `**#${i + 1}** — ${w.reason} *(by ${w.warnedBy} on ${date})*`;
      }).join('\n');

      const warnCount = warns[userId].warns.length;
      const nextTimeout = getTimeoutDuration(warnCount + 1);

      return interaction.reply({
        content:
`📋 **Warns for ${target.tag}** — ${warnCount}/8

${list}

${nextTimeout ? `⏭️ Next warn will trigger a **${nextTimeout}-minute timeout**` : warnCount >= 8 ? '🔴 Max warns reached' : ''}`,
        ephemeral: true
      });
    }

    // CLEARWARNS
    if (interaction.commandName === 'clearwarns') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ Only admins can clear all warns.',
          ephemeral: true
        });
      }

      const target = interaction.options.getUser('user');
      const userId = target.id;
      const warns = loadWarns();

      delete warns[userId];
      saveWarns(warns);

      return interaction.reply({
        content: `🧹 Cleared all warns for **${target.tag}**.`
      });
    }
  }

  // VERIFY BUTTON
  if (interaction.isButton()) {
    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        await interaction.reply({ content: '✅ You are now verified!', ephemeral: true });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Failed to verify.', ephemeral: true });
      }
    }
  }
});

// SLASH COMMANDS REGISTRATION
const commands = [

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send announcement')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Optional announcement title')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('verifypanel')
    .setDescription('Send verification panel'),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for warning')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove the latest warn from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to unwarn')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warns for a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to check')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear ALL warns for a member (admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to clear warns for')
        .setRequired(true)
    )

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    // Guild-specific registration = shows up INSTANTLY
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered (guild)');
    client.login(TOKEN);
  } catch (error) {
    console.error(error);
  }
})();

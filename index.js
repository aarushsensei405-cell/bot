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
  StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// ================= EXPRESS =================
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is online!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1432272831722553398';

const STAFF_CHANNEL_ID = '1432277470878498866';

// Roles
const VERIFY_ROLE_ID = '1432277416109281371';

const ROLE_MAP = {
  helper: '1433055763051446272',
  chatmod: '1432278296347021352',
  mcmod: '1432277404864483390'
};

const MOD_ROLE_IDS = [
  '1432277404864483390',
  '1432277404046331984'
];

// ================= COOLDOWN (7 DAYS) =================
const COOLDOWN_FILE = path.join(__dirname, 'cooldowns.json');
const COOLDOWN_TIME = 7 * 24 * 60 * 60 * 1000;

function loadCooldowns() {
  try {
    return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCooldowns(data) {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
}

// ================= WARN SYSTEM =================
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

function hasModPermission(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return MOD_ROLE_IDS.some(r => member.roles.cache.has(r));
}

// ================= CLIENT =================
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

// ================= EXPRESS APPLICATION ENDPOINT =================
app.post('/apply', async (req, res) => {
  try {
    const { username, discordId, role, answers } = req.body;

    const cooldowns = loadCooldowns();
    const now = Date.now();

    // cooldown check
    if (cooldowns[discordId] && now - cooldowns[discordId] < COOLDOWN_TIME) {
      return res.status(429).json({
        success: false,
        message: 'You can only apply once every 7 days.'
      });
    }

    cooldowns[discordId] = now;
    saveCooldowns(cooldowns);

    const channel = await client.channels.fetch(STAFF_CHANNEL_ID);

    const embed = {
      color: 0x00ffcc,
      title: `📩 New Application - ${role.toUpperCase()}`,
      fields: [
        { name: '👤 Username', value: username || 'N/A', inline: true },
        { name: '🆔 Discord ID', value: discordId || 'N/A', inline: true },
        { name: '🎯 Role', value: role || 'N/A', inline: true },
        { name: '📝 Answers', value: JSON.stringify(answers || {}, null, 2).slice(0, 1024) }
      ],
      timestamp: new Date()
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${discordId}_${role}`)
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`reject_${discordId}_${role}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

  // BUTTONS (ACCEPT / REJECT)
  if (interaction.isButton()) {

    const [action, userId, role] = interaction.customId.split('_');
    const roleId = ROLE_MAP[role];

    if (action === 'accept') {
      try {
        const member = await interaction.guild.members.fetch(userId);
        if (member && roleId) await member.roles.add(roleId);

        await member.send(`🎉 You were ACCEPTED for **${role.toUpperCase()}**`).catch(() => {});
      } catch {}

      return interaction.update({
        content: `✅ ACCEPTED <@${userId}> for **${role.toUpperCase()}**`,
        components: []
      });
    }

    if (action === 'reject') {
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.send(`❌ You were REJECTED for **${role.toUpperCase()}**`).catch(() => {});
      } catch {}

      return interaction.update({
        content: `❌ REJECTED <@${userId}> for **${role.toUpperCase()}**`,
        components: []
      });
    }

    // VERIFY BUTTON
    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        await interaction.reply({ content: '✅ You are now verified!', ephemeral: true });
      } catch {
        await interaction.reply({ content: '❌ Failed to verify.', ephemeral: true });
      }
    }
  }

  // SLASH COMMANDS
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'applypanel') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only', ephemeral: true });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('apply_menu')
        .setPlaceholder('📩 Select application type')
        .addOptions(
          { label: 'Chat Moderator', value: 'chatmod' },
          { label: 'Helper', value: 'helper' },
          { label: 'Minecraft Moderator', value: 'mcmod' }
        );

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.channel.send({
        content: `📩 **Applications Open!**`,
        components: [row]
      });

      return interaction.reply({ content: 'Panel sent!', ephemeral: true });
    }
  }

  // DROPDOWN MENU
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === 'apply_menu') {

      const link = 'https://thunderous-basbousa-0fe866.netlify.app/';

      return interaction.reply({
        content: `🌐 Apply here:\n${link}\n\nSelected: **${interaction.values[0]}**`,
        ephemeral: true
      });
    }
  }
});

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName('applypanel').setDescription('Send application panel')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Commands registered');
    client.login(TOKEN);

  } catch (err) {
    console.error(err);
  }
})();

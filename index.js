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

// Timeout durations per warn count
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

/* =======================
   AUTO RESPONSES
======================= */
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  if (msg === 'ip') {
    return message.reply(`🚧 **The server IP has not been released yet!**`);
  }

  if (msg === 'rules') {
    return message.reply(`📜 **Rules are coming soon!**`);
  }
});

/* =======================
   INTERACTIONS
======================= */
client.on('interactionCreate', async interaction => {

  /* =======================
     SLASH COMMANDS
  ======================= */
  if (interaction.isChatInputCommand()) {

    // =======================
    // APPLY PANEL (NEW)
    // =======================
    if (interaction.commandName === 'applypanel') {

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ Admins only.',
          ephemeral: true
        });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('apply_menu')
        .setPlaceholder('📩 Select application type')
        .addOptions(
          {
            label: 'Chat Moderator',
            value: 'chatmod',
            description: 'Apply for Chat Moderator role',
          },
          {
            label: 'Helper',
            value: 'helper',
            description: 'Apply for Helper role',
          },
          {
            label: 'Minecraft Moderator',
            value: 'mcmod',
            description: 'Apply for Minecraft Moderator role',
          }
        );

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.channel.send({
        content: `📩 **Staff Applications Open!**\nSelect your role below to apply.`,
        components: [row]
      });

      return interaction.reply({
        content: '✅ Application panel sent!',
        ephemeral: true
      });
    }

    // (YOUR OTHER COMMANDS STAY EXACTLY SAME BELOW)
  }

  /* =======================
     DROPDOWN MENU HANDLER
  ======================= */
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === 'apply_menu') {

      const role = interaction.values[0];

      const links = {
        chatmod: 'http://goldenheartsmp.chickenkiller.com/apply/chatmod',
        helper: 'http://goldenheartsmp.chickenkiller.com/apply/helper',
        mcmod: 'http://goldenheartsmp.chickenkiller.com/apply/mcmod',
      };

      return interaction.reply({
        content: `🌐 **Continue your application here:**\n👉 ${links[role]}`,
        ephemeral: true
      });
    }
  }

  /* =======================
     VERIFY BUTTON
  ======================= */
  if (interaction.isButton()) {
    if (interaction.customId === 'verify') {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        await interaction.reply({ content: '✅ You are now verified!', ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: '❌ Failed to verify.', ephemeral: true });
      }
    }
  }
});

/* =======================
   SLASH COMMANDS
======================= */
const commands = [

  new SlashCommandBuilder().setName('announce').setDescription('Send announcement'),

  new SlashCommandBuilder().setName('verifypanel').setDescription('Send verification panel'),

  new SlashCommandBuilder().setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder().setName('unwarn').setDescription('Remove warn'),

  new SlashCommandBuilder().setName('warnings').setDescription('View warns'),

  new SlashCommandBuilder().setName('clearwarns').setDescription('Clear warns'),

  // NEW
  new SlashCommandBuilder()
    .setName('applypanel')
    .setDescription('Send application dropdown panel')

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Slash commands registered');
    client.login(TOKEN);

  } catch (err) {
    console.error(err);
  }
})();

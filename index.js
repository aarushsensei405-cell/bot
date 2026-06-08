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
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// ================= EXPRESS =================
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot Online'));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1432272831722553398';

const STAFF_CHANNEL_ID = '1432277470878498866';

const VERIFY_ROLE_ID = '1432277416109281371';

const ROLE_MAP = {
  "Chat Moderator": '1432277404046331984',
  "Helper": '1433055763051446272',
  "Minecraft Chat Moderator": '1432277404864483390'
};

// ================= FILES =================
const WARN_FILE = path.join(__dirname, 'warns.json');
const COOLDOWN_FILE = path.join(__dirname, 'cooldowns.json');

// ================= DATA =================
function load(file) {
  try { return JSON.parse(fs.readFileSync(file)); }
  catch { return {}; }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================= BAD WORD AUTO MOD =================
const badWords = ["noob", "idiot", "stupid", "lmao toxic", "hack"];

function containsBadWords(msg) {
  return badWords.some(w => msg.toLowerCase().includes(w));
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
  console.log(`${client.user.tag} ready`);
});

// ================= AUTO MOD =================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (containsBadWords(message.content)) {
    await message.delete().catch(() => {});

    const warns = load(WARN_FILE);
    const id = message.author.id;

    warns[id] = (warns[id] || 0) + 1;
    save(WARN_FILE, warns);

    await message.author.send(
      `⚠️ You received an auto-warning for bad language.\nTotal warns: ${warns[id]}`
    ).catch(() => {});

    await message.channel.send(
      `⚠️ <@${id}> was warned automatically (Total: ${warns[id]})`
    );
  }
});

// ================= APPLY SYSTEM =================
app.post('/apply', async (req, res) => {
  try {
    const data = req.body;

    const cooldowns = load(COOLDOWN_FILE);
    const now = Date.now();

    if (cooldowns[data.discordId] && now - cooldowns[data.discordId] < 7 * 86400000) {
      return res.status(429).json({ success: false, message: "Cooldown active" });
    }

    cooldowns[data.discordId] = now;
    save(COOLDOWN_FILE, cooldowns);

    const channel = await client.channels.fetch(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle(`📩 New Application — ${data.role}`)
      .setColor(0xf0b429)
      .addFields(
        { name: "User", value: data.discordUser || "N/A", inline: true },
        { name: "Age", value: String(data.age), inline: true },
        { name: "Timezone", value: data.timezone, inline: true },
        { name: "Hours", value: data.hours, inline: true },
        { name: "MC Name", value: data.mcUser || "N/A", inline: true },
        { name: "Why", value: data.why?.slice(0, 1024) || "N/A" },
        { name: "Experience", value: data.experience?.slice(0, 1024) || "N/A" },
        { name: "Scenario", value: data.scenario?.slice(0, 1024) || "N/A" },
        { name: "Extra", value: data.extra?.slice(0, 1024) || "N/A" }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${data.discordId}_${data.role}`)
        .setLabel("✅ Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`reject_${data.discordId}_${data.role}`)
        .setLabel("❌ Reject")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    res.json({ success: true });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async i => {

  // VERIFY
  if (i.isButton() && i.customId === 'verify') {
    await i.member.roles.add(VERIFY_ROLE_ID).catch(() => {});
    return i.reply({ content: "✅ Verified!", ephemeral: true });
  }

  // ACCEPT / REJECT
  if (i.isButton()) {
    const [action, userId, role] = i.customId.split('_');

    const roleId = ROLE_MAP[role];

    if (action === 'accept') {
      const member = await i.guild.members.fetch(userId).catch(() => null);

      if (member && roleId) await member.roles.add(roleId).catch(() => {});

      await member?.send(`🎉 Accepted for ${role}`).catch(() => {});

      await i.update({ content: `✅ Accepted <@${userId}>`, components: [] });

      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then(ch => ch.send(`✅ ACCEPTED: <@${userId}> (${role})`));

      return;
    }

    if (action === 'reject') {
      const member = await i.guild.members.fetch(userId).catch(() => null);

      await member?.send(`❌ Rejected for ${role}`).catch(() => {});

      await i.update({ content: `❌ Rejected <@${userId}>`, components: [] });

      await client.channels.fetch(STAFF_CHANNEL_ID)
        .then(ch => ch.send(`❌ REJECTED: <@${userId}> (${role})`));

      return;
    }
  }

  // SLASH COMMANDS
  if (i.isChatInputCommand()) {

    // APPLY PANEL
    if (i.commandName === 'applypanel') {
      if (!i.member.permissions.has(PermissionFlagsBits.Administrator))
        return i.reply({ content: "Admins only", ephemeral: true });

      const menu = new StringSelectMenuBuilder()
        .setCustomId('apply_menu')
        .setPlaceholder("Select role")
        .addOptions(
          { label: "Chat Moderator", value: "chatmod" },
          { label: "Helper", value: "helper" },
          { label: "Minecraft Moderator", value: "mcmod" }
        );

      const row = new ActionRowBuilder().addComponents(menu);

      await i.channel.send({
        content: "📩 Applications Open!",
        components: [row]
      });

      return i.reply({ content: "Panel sent", ephemeral: true });
    }

    // ANNOUNCEMENT
    if (i.commandName === 'announce') {
      const msg = i.options.getString('message');

      const embed = new EmbedBuilder()
        .setTitle("📢 Announcement")
        .setColor(0xf0b429)
        .setDescription(msg)
        .setTimestamp();

      await i.channel.send({ embeds: [embed] });

      return i.reply({ content: "Sent", ephemeral: true });
    }

    // WARN SYSTEM
    if (i.commandName === 'warn') {
      const user = i.options.getUser('user');
      const reason = i.options.getString('reason');

      const warns = load(WARN_FILE);
      warns[user.id] = (warns[user.id] || 0) + 1;
      save(WARN_FILE, warns);

      await user.send(`⚠️ You were warned: ${reason}`).catch(() => {});
      return i.reply(`Warned ${user.tag} (${warns[user.id]} warns)`);
    }

    if (i.commandName === 'unwarn') {
      const user = i.options.getUser('user');
      const warns = load(WARN_FILE);

      warns[user.id] = Math.max((warns[user.id] || 1) - 1, 0);
      save(WARN_FILE, warns);

      return i.reply(`Removed warn from ${user.tag}`);
    }

    if (i.commandName === 'warnings') {
      const user = i.options.getUser('user');
      const warns = load(WARN_FILE);

      return i.reply(`${user.tag} has ${warns[user.id] || 0} warns`);
    }
  }

  // DROPDOWN
  if (i.isStringSelectMenu() && i.customId === 'apply_menu') {
    return i.reply({
      content: "Use website to apply",
      ephemeral: true
    });
  }
});

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName('applypanel').setDescription('Send panel'),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Announcement')
    .addStringOption(o =>
      o.setName('message').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn user')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addStringOption(o => o.setName('reason').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove warn')
    .addUserOption(o => o.setName('user').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warnings')
    .addUserOption(o => o.setName('user').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });

  client.login(TOKEN);
})();

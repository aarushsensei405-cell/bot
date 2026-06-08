const express = require("express");
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
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ================= EXPRESS =================
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is online!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "1432272831722553398";

const STAFF_CHANNEL_ID = "1432277470878498866";
const VERIFY_ROLE_ID = "1432277416109281371";

// Roles
const ROLE_MAP = {
  helper: "1433055763051446272",
  chatmod: "1432278296347021352",
  mcmod: "1432277404864483390"
};

const MOD_ROLE_IDS = [
  "1432277404864483390",
  "1432277404046331984"
];

// ================= FILES =================
const COOLDOWN_FILE = path.join(__dirname, "cooldowns.json");
const WARNS_FILE = path.join(__dirname, "warns.json");

// ================= UTIL =================
function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================= WARN SYSTEM =================
function getWarns() {
  return loadJSON(WARNS_FILE);
}

function addWarn(userId, reason) {
  const warns = getWarns();
  if (!warns[userId]) warns[userId] = [];
  warns[userId].push({ reason, date: Date.now() });
  saveJSON(WARNS_FILE, warns);
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

client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

// ================= AUTO RESPONSES =================
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.toLowerCase();

  if (content.includes("ip")) {
    msg.reply("❌ IP sharing is not allowed. Please follow server rules.");
  }

  if (content.includes("rules")) {
    msg.reply("📜 Server Rules: Be respectful, no cheating, no spam, no abuse.");
  }

  if (content === "help") {
    msg.reply("📌 Commands: /applypanel, /warn, /announce");
  }
});

// ================= APPLY SYSTEM =================
app.post("/apply", async (req, res) => {
  try {
    const { role, discordUser, age, timezone, hours, why, experience, mcUser, scenario, extra } = req.body;

    const cooldowns = loadJSON(COOLDOWN_FILE);
    const now = Date.now();

    if (cooldowns[discordUser] && now - cooldowns[discordUser] < 7 * 24 * 60 * 60 * 1000) {
      return res.status(429).json({ success: false, message: "Cooldown active" });
    }

    cooldowns[discordUser] = now;
    saveJSON(COOLDOWN_FILE, cooldowns);

    const channel = await client.channels.fetch(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle(`📩 New Application - ${role}`)
      .setColor(0xf0b429)
      .addFields(
        { name: "Discord", value: discordUser || "N/A", inline: true },
        { name: "Age", value: String(age || "N/A"), inline: true },
        { name: "Timezone", value: timezone || "N/A", inline: true },
        { name: "Hours", value: hours || "N/A", inline: true },
        { name: "Minecraft", value: mcUser || "N/A", inline: true },
        { name: "Why", value: why?.slice(0, 1024) || "N/A" },
        { name: "Experience", value: experience?.slice(0, 1024) || "N/A" },
        { name: "Scenario", value: scenario?.slice(0, 1024) || "N/A" },
        { name: "Extra", value: extra?.slice(0, 1024) || "N/A" }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${discordUser}_${role}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`reject_${discordUser}_${role}`)
        .setLabel("Reject")
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
client.on("interactionCreate", async (interaction) => {
  // BUTTONS
  if (interaction.isButton()) {
    const [action, userId, role] = interaction.customId.split("_");

    const roleId = ROLE_MAP[role];

    if (action === "accept") {
      try {
        const member = await interaction.guild.members.fetch(userId);
        if (member && roleId) await member.roles.add(roleId);
        member.send(`✅ Accepted for ${role}`).catch(() => {});
      } catch {}

      return interaction.update({
        content: `✅ Accepted <@${userId}>`,
        components: []
      });
    }

    if (action === "reject") {
      try {
        const member = await interaction.guild.members.fetch(userId);
        member.send(`❌ Rejected for ${role}`).catch(() => {});
      } catch {}

      return interaction.update({
        content: `❌ Rejected <@${userId}>`,
        components: []
      });
    }

    if (interaction.customId === "verify") {
      try {
        await interaction.member.roles.add(VERIFY_ROLE_ID);
        return interaction.reply({ content: "Verified!", ephemeral: true });
      } catch {
        return interaction.reply({ content: "Failed", ephemeral: true });
      }
    }
  }

  // SLASH COMMANDS
  if (interaction.isChatInputCommand()) {

    // APPLY PANEL
    if (interaction.commandName === "applypanel") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("apply_menu")
        .setPlaceholder("Select role")
        .addOptions(
          { label: "Chat Moderator", value: "chatmod" },
          { label: "Helper", value: "helper" },
          { label: "Minecraft Mod", value: "mcmod" }
        );

      return interaction.reply({
        content: "Applications:",
        components: [new ActionRowBuilder().addComponents(menu)]
      });
    }

    // ANNOUNCE
    if (interaction.commandName === "announce") {
      const msg = interaction.options.getString("message");

      const embed = new EmbedBuilder()
        .setTitle("📢 Announcement")
        .setDescription(msg)
        .setColor("Gold");

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({ content: "Sent!", ephemeral: true });
    }

    // WARN
    if (interaction.commandName === "warn") {
      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");

      addWarn(user.id, reason);

      return interaction.reply(`⚠ Warned ${user.tag}: ${reason}`);
    }
  }

  // MENU
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "apply_menu") {
      return interaction.reply({
        content: "Apply here: https://discord-bot1-laji.onrender.com",
        ephemeral: true
      });
    }
  }
});

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName("applypanel")
    .setDescription("Send application panel"),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Make announcement")
    .addStringOption(opt =>
      opt.setName("message")
        .setDescription("Message")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason")
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Commands registered");
    client.login(TOKEN);
  } catch (err) {
    console.error(err);
  }
})();

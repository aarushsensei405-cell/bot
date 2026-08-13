// ─────────────────────────────────────────
// AMETHMC — STAFF MANAGER MODULE
// Role-based — reads directly from Discord roles
// Auto-updates live panel on role changes
// ─────────────────────────────────────────
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const mongoose = require('mongoose');

// ─────────────────────────────────────────
// DISCORD ROLE ID → STAFF ROLE MAPPING
// These are your actual Discord role IDs
// ─────────────────────────────────────────
const DISCORD_ROLE_MAP = [
  { roleId: '1432277402763137087', label: 'Owner',                    emoji: '👑', color: 0xffd700 },
  { roleId: '1432277402763137087', label: 'Owner',                    emoji: '👑', color: 0xffd700 },
  { roleId: '1508415936632324266', label: 'Admin',                    emoji: '🛡️', color: 0xed4245 },
  { roleId: '1432277404046331984', label: 'Moderator',                emoji: '🔨', color: 0x5865f2 },
  { roleId: '1519698770026168420', label: 'Event Manager',            emoji: '🎉', color: 0xeb459e },
  { roleId: '1432274922788622368', label: 'Helper',                   emoji: '🤝', color: 0x57f287 },
  { roleId: '1432277404864483390', label: 'Chat Moderator',           emoji: '💬', color: 0xf0b429 },
  { roleId: '1433055763051446272', label: 'MC Chat Moderator',        emoji: '⛏️', color: 0x3dd68c },
  { roleId: '1432273598198054912', label: 'Developer & Manager',      emoji: '🧑‍💻', color: 0x9b59b6 },
];

// Remove duplicate (first two are the same ID — deduplicate)
const STAFF_ROLE_DEFS = DISCORD_ROLE_MAP.filter(
  (v, i, a) => a.findIndex(t => t.roleId === v.roleId) === i
);

// ─────────────────────────────────────────
// LIVE PANEL SCHEMA — stores the message to edit
// ─────────────────────────────────────────
const StaffPanelSchema = new mongoose.Schema({
  guildId:   { type: String, required: true, unique: true },
  channelId: String,
  messageId: String,
});
const StaffPanel = mongoose.models.StaffPanel || mongoose.model('StaffPanel', StaffPanelSchema);

// ─────────────────────────────────────────
// BUILD EMBED — reads live from guild roles
// ─────────────────────────────────────────
async function buildStaffEmbed(guild) {
  // Fetch all members so role cache is complete
  await guild.members.fetch().catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('💎 AmethMC — Staff Team')
    .setDescription([
      '> Meet the team that keeps **AmethMC** running smoothly!',
      '> Need help? Reach out to the right team below.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n'))
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
    .setTimestamp();

  let totalStaff = 0;

  for (const def of STAFF_ROLE_DEFS) {
    const role = guild.roles.cache.get(def.roleId);
    if (!role) continue;

    // Get all members with this role (filter bots)
    const members = role.members.filter(m => !m.user.bot);
    if (members.size === 0) continue;

    totalStaff += members.size;
    const mentions = members.map(m => `<@${m.id}>`).join('\n');

    embed.addFields({
      name: `${def.emoji}  <@&${def.roleId}>`,
      value: mentions,
      inline: true,
    });
  }

  if (embed.data.fields?.length === 0) {
    embed.addFields({
      name: '📋 No staff found',
      value: 'No members have been assigned any staff roles yet.',
      inline: false,
    });
  }

  embed.setFooter({ text: `AmethMC • ${totalStaff} staff member${totalStaff !== 1 ? 's' : ''} • Last updated` });
  return embed;
}

// ─────────────────────────────────────────
// UPDATE LIVE PANEL — edits the pinned message
// ─────────────────────────────────────────
async function updateStaffPanel(client, guildId) {
  try {
    const panelData = await StaffPanel.findOne({ guildId });
    if (!panelData?.channelId || !panelData?.messageId) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = await client.channels.fetch(panelData.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(panelData.messageId).catch(() => null);
    if (!message) return;

    const embed = await buildStaffEmbed(guild);
    await message.edit({ embeds: [embed] });
    console.log('✅ Staff panel updated');
  } catch (err) {
    console.error('Staff panel update error:', err.message);
  }
}

// ─────────────────────────────────────────
// SLASH COMMAND DEFINITIONS
// ─────────────────────────────────────────
const staffCommandsData = [
  new SlashCommandBuilder()
    .setName('staff')
    .setDescription('View the AmethMC staff team'),

  new SlashCommandBuilder()
    .setName('staffpanel')
    .setDescription('Post a live auto-updating staff panel (Admin only)')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel to post the panel in (default: current)')
        .setRequired(false)
    ),
];

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function initStaffManager(client) {

  // ── Listen for role changes and auto-update panel ──
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== newMember.guild.id) return;

    // Check if any staff role was added or removed
    const staffRoleIds = new Set(STAFF_ROLE_DEFS.map(d => d.roleId));
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    let staffRoleChanged = false;
    for (const id of staffRoleIds) {
      if (oldRoles.has(id) !== newRoles.has(id)) {
        staffRoleChanged = true;
        break;
      }
    }

    if (staffRoleChanged) {
      console.log(`[StaffManager] Role change detected for ${newMember.user.tag} — updating panel`);
      await updateStaffPanel(client, newMember.guild.id);
    }
  });

  // ── Slash commands ──
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // ── /staff ──
    if (interaction.commandName === 'staff') {
      await interaction.deferReply();
      try {
        const embed = await buildStaffEmbed(interaction.guild);
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Staff list error:', err);
        return interaction.editReply('❌ Failed to load staff list.');
      }
    }

    // ── /staffpanel ──
    if (interaction.commandName === 'staffpanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const embed   = await buildStaffEmbed(interaction.guild);
      const msg     = await channel.send({ embeds: [embed] });

      // Save panel location
      await StaffPanel.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { guildId: interaction.guild.id, channelId: channel.id, messageId: msg.id },
        { upsert: true }
      );

      return interaction.editReply({
        content: `✅ Staff panel posted in <#${channel.id}>! It will auto-update whenever a staff role is assigned or removed.`,
      });
    }
  });

  console.log('✅ Staff Manager initialized (Discord role-based, live panel)');
}

module.exports = {
  initStaffManager,
  staffCommandsData,
  STAFF_ROLE_DEFS,
  StaffPanel,
  buildStaffEmbed,
  updateStaffPanel,
};

// ─────────────────────────────────────────
// GOLDENHEART SMP — STAFF MANAGER MODULE
// Standalone file — MongoDB backed
// ─────────────────────────────────────────
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const mongoose = require('mongoose');

// ─────────────────────────────────────────
// ROLE DEFINITIONS (order = display order)
// ─────────────────────────────────────────
const STAFF_ROLES = {
  owner: { label: 'Owner', emoji: '👑', color: 0xffd700 },
  admin: { label: 'Admin', emoji: '🛡️', color: 0xed4245 },
  moderator: { label: 'Moderator', emoji: '🔨', color: 0x5865f2 },
  event_manager: { label: 'Event Manager', emoji: '🎉', color: 0xeb459e },
  helper: { label: 'Helper', emoji: '🤝', color: 0x57f287 },
  chat_mod: { label: 'Chat Mod', emoji: '💬', color: 0xf0b429 },
  mc_chat_mod: { label: 'MC Chat Mod', emoji: '⛏️', color: 0x3dd68c },
  dev_manager: { label: 'Helping Developer & Manager', emoji: '🧑‍💻', color: 0x9b59b6 },
};

const ROLE_ORDER = [
  'owner', 'admin', 'moderator', 'event_manager',
  'helper', 'chat_mod', 'mc_chat_mod', 'dev_manager',
];

const ROLE_CHOICES = ROLE_ORDER.map(key => ({
  name: `${STAFF_ROLES[key].emoji} ${STAFF_ROLES[key].label}`,
  value: key,
}));

// ─────────────────────────────────────────
// MONGODB SCHEMA / MODEL
// ─────────────────────────────────────────
const StaffMemberSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  role: { type: String, required: true, enum: ROLE_ORDER },
  addedBy: String,
  addedAt: { type: Date, default: Date.now },
});
// One user can hold multiple roles, but not the SAME role twice
StaffMemberSchema.index({ userId: 1, role: 1 }, { unique: true });

const StaffMember = mongoose.models.StaffMember || mongoose.model('StaffMember', StaffMemberSchema);

// ─────────────────────────────────────────
// DB HELPERS
// ─────────────────────────────────────────
async function addStaffMember(userId, role, addedBy) {
  return StaffMember.findOneAndUpdate(
    { userId, role },
    { userId, role, addedBy, addedAt: new Date() },
    { upsert: true, new: true }
  );
}

async function removeStaffMember(userId, role) {
  const res = await StaffMember.deleteOne({ userId, role });
  return res.deletedCount > 0;
}

async function getAllStaff() {
  return StaffMember.find({}).lean();
}

async function getStaffByRole(role) {
  return StaffMember.find({ role }).lean();
}

// ─────────────────────────────────────────
// EMBED BUILDER
// ─────────────────────────────────────────
function buildStaffEmbed(staffList, guild) {
  const grouped = {};
  for (const key of ROLE_ORDER) grouped[key] = [];
  for (const entry of staffList) {
    if (grouped[entry.role]) grouped[entry.role].push(entry.userId);
  }

  const embed = new EmbedBuilder()
    .setColor(0xf0b429)
    .setTitle('🏰 GoldenHeart SMP — Staff Team')
    .setDescription([
      '> Meet the team that keeps GoldenHeart SMP running smoothly!',
      '> Have a question or an issue? Reach out to the right team below.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n'))
    .setThumbnail(guild?.iconURL({ dynamic: true, size: 256 }) || null)
    .setFooter({ text: `GoldenHeart SMP • ${staffList.length} staff member${staffList.length !== 1 ? 's' : ''} • Updated` })
    .setTimestamp();

  let hasAny = false;
  for (const key of ROLE_ORDER) {
    const ids = grouped[key];
    if (ids.length === 0) continue;
    hasAny = true;
    const meta = STAFF_ROLES[key];
    const mentions = ids.map(id => `<@${id}>`).join('\n');
    embed.addFields({
      name: `${meta.emoji}  ${meta.label}`,
      value: mentions,
      inline: true,
    });
  }

  if (!hasAny) {
    embed.addFields({
      name: '📋 No staff configured yet',
      value: 'Use `/addstaff` to add the first staff member!',
      inline: false,
    });
  }

  return embed;
}

// ─────────────────────────────────────────
// SLASH COMMAND DEFINITIONS (export & merge into your commandsList)
// ─────────────────────────────────────────
const staffCommandsData = [
  new SlashCommandBuilder()
    .setName('staff')
    .setDescription('📋 View the GoldenHeart SMP staff team'),

  new SlashCommandBuilder()
    .setName('addstaff')
    .setDescription('➕ Add or update a staff member (Admin only)')
    .addUserOption(o => o.setName('user').setDescription('The user to add as staff').setRequired(true))
    .addStringOption(o => o.setName('role').setDescription('Staff role to assign').setRequired(true).addChoices(...ROLE_CHOICES)),

  new SlashCommandBuilder()
    .setName('removestaff')
    .setDescription('➖ Remove a staff member from a role (Admin only)')
    .addUserOption(o => o.setName('user').setDescription('The user to remove').setRequired(true))
    .addStringOption(o => o.setName('role').setDescription('Staff role to remove').setRequired(true).addChoices(...ROLE_CHOICES)),
];

// ─────────────────────────────────────────
// INIT — wires up interactionCreate listener
// Call this once in your main file after client is ready
// ─────────────────────────────────────────
function initStaffManager(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // ── /staff ──
    if (interaction.commandName === 'staff') {
      await interaction.deferReply();
      try {
        const staffList = await getAllStaff();
        const embed = buildStaffEmbed(staffList, interaction.guild);
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Staff list fetch error:', err);
        return interaction.editReply('❌ Failed to load staff list.');
      }
    }

    // ── /addstaff ──
    if (interaction.commandName === 'addstaff') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Only admins can use this command.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      const roleKey = interaction.options.getString('role');
      const meta = STAFF_ROLES[roleKey];

      if (!meta) return interaction.reply({ content: '❌ Invalid role.', ephemeral: true });
      if (target.bot) return interaction.reply({ content: '❌ Bots cannot be staff members.', ephemeral: true });

      try {
        await addStaffMember(target.id, roleKey, interaction.user.id);

        const embed = new EmbedBuilder()
          .setTitle('✅ Staff Member Added')
          .setColor(0x57f287)
          .setDescription(`<@${target.id}> has been added as **${meta.emoji} ${meta.label}**!`)
          .addFields(
            { name: '👤 User', value: `${target.tag}`, inline: true },
            { name: '🏷️ Role', value: `${meta.emoji} ${meta.label}`, inline: true },
            { name: '👮 Added By', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('Add staff error:', err);
        return interaction.reply({ content: '❌ Failed to add staff member. They may already hold this role.', ephemeral: true });
      }
    }

    // ── /removestaff ──
    if (interaction.commandName === 'removestaff') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Only admins can use this command.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      const roleKey = interaction.options.getString('role');
      const meta = STAFF_ROLES[roleKey];

      try {
        const removed = await removeStaffMember(target.id, roleKey);
        if (!removed) {
          return interaction.reply({ content: `⚠️ <@${target.id}> doesn't hold the **${meta.label}** role.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle('🗑️ Staff Member Removed')
          .setColor(0xed4245)
          .setDescription(`<@${target.id}> has been removed from **${meta.emoji} ${meta.label}**.`)
          .addFields({ name: '👮 Removed By', value: `<@${interaction.user.id}>`, inline: true })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('Remove staff error:', err);
        return interaction.reply({ content: '❌ Failed to remove staff member.', ephemeral: true });
      }
    }
  });

  console.log('✅ Staff Manager initialized');
}

module.exports = {
  initStaffManager,
  staffCommandsData,
  STAFF_ROLES,
  ROLE_ORDER,
  StaffMember,
  addStaffMember,
  removeStaffMember,
  getAllStaff,
  getStaffByRole,
  buildStaffEmbed,
};

// ─────────────────────────────────────────
// AMETHMC — STAFF MANAGER MODULE
// Fully customizable live panel
// Auto-updates on role changes
// ─────────────────────────────────────────
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} = require('discord.js');
const mongoose = require('mongoose');

// ─────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────

// Stores the live panel message location
const StaffPanelSchema = new mongoose.Schema({
  guildId:     { type: String, required: true, unique: true },
  channelId:   String,
  messageId:   String,
  // Panel appearance config
  title:       { type: String, default: '💎 AmethMC — Staff Team' },
  description: { type: String, default: '> Meet the team that keeps **AmethMC** running smoothly!\n> Need help? Reach out to the right team below.' },
  color:       { type: String, default: '9b59b6' },
  footerText:  { type: String, default: 'AmethMC Staff Team' },
  showMemberCount: { type: Boolean, default: true },
  // Ordered list of role entries
  roles: [{
    roleId:      String,
    emoji:       { type: String, default: '👤' },
    displayName: String,   // override label (leave blank to use Discord role name)
    showAs:      { type: String, default: 'mention', enum: ['mention', 'username', 'tag'] },
    order:       { type: Number, default: 0 },
  }],
});

const StaffPanel = mongoose.models.StaffPanel || mongoose.model('StaffPanel', StaffPanelSchema);

// ─────────────────────────────────────────
// DEFAULT ROLE CONFIG (preloaded on first setup)
// ─────────────────────────────────────────
const DEFAULT_ROLES = [
  { roleId: '1432277402763137087', emoji: '👑', displayName: '',           showAs: 'mention', order: 0 },
  { roleId: '1508415936632324266', emoji: '🛡️', displayName: '',           showAs: 'mention', order: 1 },
  { roleId: '1432277404046331984', emoji: '🔨', displayName: '',           showAs: 'mention', order: 2 },
  { roleId: '1519698770026168420', emoji: '🎉', displayName: '',           showAs: 'mention', order: 3 },
  { roleId: '1432274922788622368', emoji: '🤝', displayName: '',           showAs: 'mention', order: 4 },
  { roleId: '1432277404864483390', emoji: '💬', displayName: '',           showAs: 'mention', order: 5 },
  { roleId: '1433055763051446272', emoji: '⛏️', displayName: '',           showAs: 'mention', order: 6 },
  { roleId: '1432273598198054912', emoji: '🧑‍💻', displayName: '',          showAs: 'mention', order: 7 },
];

// ─────────────────────────────────────────
// BUILD EMBED — reads live from guild roles
// ─────────────────────────────────────────
async function buildStaffEmbed(guild, config) {
  // Fetch all members so role cache is populated
  await guild.members.fetch().catch(() => {});

  const color = parseInt(config?.color || '9b59b6', 16);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(config?.title || '💎 AmethMC — Staff Team')
    .setDescription([
      config?.description || '> Meet the team that keeps **AmethMC** running smoothly!\n> Need help? Reach out to the right team below.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n'))
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
    .setTimestamp();

  const roles = [...(config?.roles || DEFAULT_ROLES)].sort((a, b) => a.order - b.order);
  let totalStaff = 0;

  for (const def of roles) {
    const role = guild.roles.cache.get(def.roleId);
    if (!role) continue;

    const members = role.members.filter(m => !m.user.bot);
    if (members.size === 0) continue;

    totalStaff += members.size;

    // Format each member based on showAs setting
    const memberLines = members.map(m => {
      if (def.showAs === 'username') return `\`${m.user.username}\``;
      if (def.showAs === 'tag')      return `\`${m.user.tag}\``;
      return `<@${m.id}>`;  // default: mention
    }).join('\n');

    // Field name: emoji + role ping (or custom display name)
    const label = def.displayName?.trim()
      ? `${def.emoji}  ${def.displayName}`
      : `${def.emoji}  <@&${def.roleId}>`;

    embed.addFields({
      name:   label,
      value:  memberLines || '*None*',
      inline: true,
    });
  }

  if (!embed.data.fields || embed.data.fields.length === 0) {
    embed.addFields({
      name:  '📋 No staff found',
      value: 'No members have been assigned any staff roles yet.',
      inline: false,
    });
  }

  const footerBase = config?.footerText || 'AmethMC Staff Team';
  const footerCount = config?.showMemberCount !== false
    ? ` • ${totalStaff} staff member${totalStaff !== 1 ? 's' : ''}`
    : '';
  embed.setFooter({ text: `${footerBase}${footerCount} • Last updated` });

  return embed;
}

// ─────────────────────────────────────────
// UPDATE LIVE PANEL
// ─────────────────────────────────────────
async function updateStaffPanel(client, guildId) {
  try {
    const config = await StaffPanel.findOne({ guildId });
    if (!config?.channelId || !config?.messageId) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(config.messageId).catch(() => null);
    if (!message) return;

    const embed = await buildStaffEmbed(guild, config);
    await message.edit({ embeds: [embed] });
    console.log('✅ Staff panel auto-updated');
  } catch (err) {
    console.error('[StaffPanel] Update error:', err.message);
  }
}

// ─────────────────────────────────────────
// HELPER — build the config main menu embed
// ─────────────────────────────────────────
function buildConfigMenuEmbed(config) {
  const roles = [...(config?.roles || DEFAULT_ROLES)].sort((a, b) => a.order - b.order);
  const roleList = roles.map((r, i) =>
    `\`${i + 1}.\` <@&${r.roleId}> — ${r.emoji} — show as \`${r.showAs}\`${r.displayName ? ` — label: \`${r.displayName}\`` : ''}`
  ).join('\n') || '*No roles configured*';

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('⚙️ Staff Panel Config')
    .setDescription('Use the buttons below to customize the staff panel.')
    .addFields(
      { name: '📌 Title',        value: `\`${config?.title || '💎 AmethMC — Staff Team'}\``,  inline: false },
      { name: '🎨 Embed Color',  value: `\`#${config?.color || '9b59b6'}\``,                  inline: true  },
      { name: '👣 Footer',       value: `\`${config?.footerText || 'AmethMC Staff Team'}\``,  inline: true  },
      { name: '🔢 Member Count', value: config?.showMemberCount !== false ? '✅ Shown' : '❌ Hidden', inline: true },
      { name: '📋 Configured Roles', value: roleList, inline: false },
    )
    .setFooter({ text: 'Changes are saved and panel is updated immediately' })
    .setTimestamp();
}

function buildConfigButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_edit_title').setLabel('✏️ Title').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_edit_description').setLabel('📝 Description').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_edit_color').setLabel('🎨 Color').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_edit_footer').setLabel('👣 Footer').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_toggle_count').setLabel('🔢 Toggle Count').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_add_role').setLabel('➕ Add Role').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('sp_edit_role').setLabel('✏️ Edit Role').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('sp_remove_role').setLabel('➖ Remove Role').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('sp_reorder_role').setLabel('🔀 Reorder').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_preview').setLabel('👁️ Preview').setStyle(ButtonStyle.Primary),
  );
  return [row1, row2];
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
        .addChannelTypes(ChannelType.GuildText)
    ),

  new SlashCommandBuilder()
    .setName('staffconfig')
    .setDescription('Customize the staff panel appearance and roles (Admin only)'),
];

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function initStaffManager(client) {

  // ── Auto-update on role changes ──────────────────────────────────────────
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const config = await StaffPanel.findOne({ guildId: newMember.guild.id }).lean();
    if (!config?.roles?.length) return;

    const staffRoleIds = new Set(config.roles.map(r => r.roleId));
    const oldRoles     = new Set(oldMember.roles.cache.keys());
    const newRoles     = new Set(newMember.roles.cache.keys());

    for (const id of staffRoleIds) {
      if (oldRoles.has(id) !== newRoles.has(id)) {
        console.log(`[StaffPanel] Role change for ${newMember.user.tag} — updating panel`);
        await updateStaffPanel(client, newMember.guild.id);
        break;
      }
    }
  });

  // ── Interactions ──────────────────────────────────────────────────────────
  client.on('interactionCreate', async interaction => {

    // ── SLASH COMMANDS ──
    if (interaction.isChatInputCommand()) {

      // /staff
      if (interaction.commandName === 'staff') {
        await interaction.deferReply();
        try {
          const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
          const embed  = await buildStaffEmbed(interaction.guild, config);
          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error('Staff fetch error:', err);
          return interaction.editReply('❌ Failed to load staff list.');
        }
      }

      // /staffpanel
      if (interaction.commandName === 'staffpanel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
          return interaction.reply({ content: '❌ Admins only.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel') || interaction.channel;

        // Get or create config with default roles
        let config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = new StaffPanel({
            guildId: interaction.guild.id,
            roles:   DEFAULT_ROLES,
          });
        }

        const embed = await buildStaffEmbed(interaction.guild, config);
        const msg   = await channel.send({ embeds: [embed] });

        config.channelId = channel.id;
        config.messageId = msg.id;
        await config.save();

        return interaction.editReply({
          content: `✅ Staff panel posted in <#${channel.id}>!\nIt auto-updates when roles change.\nUse \`/staffconfig\` to customize it.`,
        });
      }

      // /staffconfig
      if (interaction.commandName === 'staffconfig') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
          return interaction.reply({ content: '❌ Admins only.', ephemeral: true });

        let config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = new StaffPanel({ guildId: interaction.guild.id, roles: DEFAULT_ROLES });
          await config.save();
        }

        const menuEmbed = buildConfigMenuEmbed(config);
        const rows      = buildConfigButtons();
        return interaction.reply({ embeds: [menuEmbed], components: rows, ephemeral: true });
      }
    }

    // ── BUTTONS ──
    if (interaction.isButton()) {

      // guard — only admins
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) return;

      const id = interaction.customId;

      // ── Preview ──
      if (id === 'sp_preview') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        const embed  = await buildStaffEmbed(interaction.guild, config);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // ── Toggle member count ──
      if (id === 'sp_toggle_count') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        config.showMemberCount = !config.showMemberCount;
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);
        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // ── Modals for text fields ──
      if (['sp_edit_title', 'sp_edit_description', 'sp_edit_color', 'sp_edit_footer'].includes(id)) {
        const fieldMap = {
          sp_edit_title:       { label: 'Panel Title',       customId: 'val_title',       style: TextInputStyle.Short,     placeholder: '💎 AmethMC — Staff Team' },
          sp_edit_description: { label: 'Panel Description', customId: 'val_description', style: TextInputStyle.Paragraph, placeholder: '> Meet the team...' },
          sp_edit_color:       { label: 'Embed Color (hex)', customId: 'val_color',        style: TextInputStyle.Short,     placeholder: '9b59b6' },
          sp_edit_footer:      { label: 'Footer Text',       customId: 'val_footer',       style: TextInputStyle.Short,     placeholder: 'AmethMC Staff Team' },
        };
        const f = fieldMap[id];
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });

        const currentVal = {
          val_title:       config?.title       || '',
          val_description: config?.description || '',
          val_color:       config?.color       || '9b59b6',
          val_footer:      config?.footerText  || '',
        }[f.customId];

        const modal = new ModalBuilder()
          .setCustomId(`sp_modal_${f.customId}`)
          .setTitle(f.label);
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(f.customId)
              .setLabel(f.label)
              .setStyle(f.style)
              .setValue(currentVal)
              .setPlaceholder(f.placeholder)
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Add Role modal ──
      if (id === 'sp_add_role') {
        const modal = new ModalBuilder()
          .setCustomId('sp_modal_add_role')
          .setTitle('➕ Add Staff Role');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('add_role_id')
              .setLabel('Role ID')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. 1432277402763137087')
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('add_role_emoji')
              .setLabel('Emoji')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. 👑')
              .setRequired(true)
              .setMaxLength(10)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('add_role_display')
              .setLabel('Custom Display Name (leave blank for role name)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('e.g. Server Owner')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('add_role_showas')
              .setLabel('Show members as: mention / username / tag')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('mention')
              .setRequired(true)
              .setMaxLength(10)
          ),
        );
        return interaction.showModal(modal);
      }

      // ── Edit Role — show select menu of current roles ──
      if (id === 'sp_edit_role') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        if (!config?.roles?.length)
          return interaction.reply({ content: '⚠️ No roles configured yet. Use ➕ Add Role first.', ephemeral: true });

        const options = config.roles.sort((a,b) => a.order - b.order).map((r, i) => {
          const role = interaction.guild.roles.cache.get(r.roleId);
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${r.emoji} ${role?.name || r.roleId}`)
            .setDescription(`Show as: ${r.showAs}${r.displayName ? ` | Label: ${r.displayName}` : ''}`)
            .setValue(`edit_${i}`);
        });

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('sp_select_edit_role')
            .setPlaceholder('Select a role to edit...')
            .addOptions(options)
        );
        return interaction.reply({ content: '✏️ Select the role you want to edit:', components: [row], ephemeral: true });
      }

      // ── Remove Role — show select menu ──
      if (id === 'sp_remove_role') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        if (!config?.roles?.length)
          return interaction.reply({ content: '⚠️ No roles configured.', ephemeral: true });

        const options = config.roles.sort((a,b) => a.order - b.order).map((r, i) => {
          const role = interaction.guild.roles.cache.get(r.roleId);
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${r.emoji} ${role?.name || r.roleId}`)
            .setValue(`remove_${i}`);
        });

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('sp_select_remove_role')
            .setPlaceholder('Select a role to remove...')
            .addOptions(options)
        );
        return interaction.reply({ content: '➖ Select the role to remove:', components: [row], ephemeral: true });
      }

      // ── Reorder — show modal ──
      if (id === 'sp_reorder_role') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        if (!config?.roles?.length)
          return interaction.reply({ content: '⚠️ No roles configured.', ephemeral: true });

        const currentOrder = config.roles
          .sort((a,b) => a.order - b.order)
          .map((r, i) => {
            const role = interaction.guild.roles.cache.get(r.roleId);
            return `${i + 1}. ${role?.name || r.roleId}`;
          }).join('\n');

        const modal = new ModalBuilder()
          .setCustomId('sp_modal_reorder')
          .setTitle('🔀 Reorder Roles');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('new_order')
              .setLabel('Enter role IDs in order (one per line)')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder(config.roles.map(r => r.roleId).join('\n'))
              .setValue(config.roles.sort((a,b) => a.order - b.order).map(r => r.roleId).join('\n'))
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // ── SELECT MENUS ──
    if (interaction.isStringSelectMenu()) {

      // Edit role selection
      if (interaction.customId === 'sp_select_edit_role') {
        const index = parseInt(interaction.values[0].replace('edit_', ''));
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        const sorted = config.roles.sort((a,b) => a.order - b.order);
        const def = sorted[index];
        if (!def) return interaction.reply({ content: '❌ Role not found.', ephemeral: true });

        const modal = new ModalBuilder()
          .setCustomId(`sp_modal_edit_role_${index}`)
          .setTitle('✏️ Edit Staff Role');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('edit_emoji')
              .setLabel('Emoji')
              .setStyle(TextInputStyle.Short)
              .setValue(def.emoji || '👤')
              .setRequired(true)
              .setMaxLength(10)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('edit_display')
              .setLabel('Custom Display Name (blank = use Discord role name)')
              .setStyle(TextInputStyle.Short)
              .setValue(def.displayName || '')
              .setRequired(false)
              .setPlaceholder('e.g. Server Owner')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('edit_showas')
              .setLabel('Show as: mention / username / tag')
              .setStyle(TextInputStyle.Short)
              .setValue(def.showAs || 'mention')
              .setRequired(true)
              .setMaxLength(10)
          ),
        );
        return interaction.showModal(modal);
      }

      // Remove role selection
      if (interaction.customId === 'sp_select_remove_role') {
        const index  = parseInt(interaction.values[0].replace('remove_', ''));
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        const sorted = config.roles.sort((a,b) => a.order - b.order);
        const def    = sorted[index];
        if (!def) return interaction.reply({ content: '❌ Role not found.', ephemeral: true });

        const role = interaction.guild.roles.cache.get(def.roleId);
        config.roles = config.roles.filter(r => r.roleId !== def.roleId);
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);

        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ content: `✅ Removed **${role?.name || def.roleId}** from the panel.`, embeds: [menuEmbed], components: buildConfigButtons() });
      }
    }

    // ── MODALS ──
    if (interaction.isModalSubmit()) {

      // Title
      if (interaction.customId === 'sp_modal_val_title') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        config.title = interaction.fields.getTextInputValue('val_title');
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);
        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // Description
      if (interaction.customId === 'sp_modal_val_description') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        config.description = interaction.fields.getTextInputValue('val_description');
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);
        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // Color
      if (interaction.customId === 'sp_modal_val_color') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        const raw    = interaction.fields.getTextInputValue('val_color').replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(raw))
          return interaction.reply({ content: '❌ Invalid hex color. Use format like `9b59b6`.', ephemeral: true });
        config.color = raw;
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);
        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // Footer
      if (interaction.customId === 'sp_modal_val_footer') {
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        config.footerText = interaction.fields.getTextInputValue('val_footer');
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);
        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // Add Role
      if (interaction.customId === 'sp_modal_add_role') {
        const roleId  = interaction.fields.getTextInputValue('add_role_id').trim();
        const emoji   = interaction.fields.getTextInputValue('add_role_emoji').trim();
        const display = interaction.fields.getTextInputValue('add_role_display').trim();
        const showAs  = ['mention','username','tag'].includes(
          interaction.fields.getTextInputValue('add_role_showas').trim().toLowerCase()
        ) ? interaction.fields.getTextInputValue('add_role_showas').trim().toLowerCase() : 'mention';

        // Validate role exists
        const discordRole = interaction.guild.roles.cache.get(roleId);
        if (!discordRole)
          return interaction.reply({ content: `❌ Role ID \`${roleId}\` not found in this server.`, ephemeral: true });

        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        if (!config)
          return interaction.reply({ content: '❌ Run `/staffpanel` first to create a panel.', ephemeral: true });

        // Check duplicate
        if (config.roles.some(r => r.roleId === roleId))
          return interaction.reply({ content: `⚠️ <@&${roleId}> is already in the panel.`, ephemeral: true });

        config.roles.push({
          roleId,
          emoji,
          displayName: display,
          showAs,
          order: config.roles.length,
        });
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);

        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ content: `✅ Added <@&${roleId}> to the panel!`, embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // Edit Role
      if (interaction.customId.startsWith('sp_modal_edit_role_')) {
        const index  = parseInt(interaction.customId.replace('sp_modal_edit_role_', ''));
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });
        const sorted = config.roles.sort((a,b) => a.order - b.order);
        const def    = sorted[index];
        if (!def) return interaction.reply({ content: '❌ Role not found.', ephemeral: true });

        const emoji   = interaction.fields.getTextInputValue('edit_emoji').trim();
        const display = interaction.fields.getTextInputValue('edit_display').trim();
        const showAs  = ['mention','username','tag'].includes(
          interaction.fields.getTextInputValue('edit_showas').trim().toLowerCase()
        ) ? interaction.fields.getTextInputValue('edit_showas').trim().toLowerCase() : 'mention';

        // Update the matching role entry
        const roleEntry = config.roles.find(r => r.roleId === def.roleId);
        if (roleEntry) {
          roleEntry.emoji       = emoji;
          roleEntry.displayName = display;
          roleEntry.showAs      = showAs;
        }
        config.markModified('roles');
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);

        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }

      // Reorder
      if (interaction.customId === 'sp_modal_reorder') {
        const input  = interaction.fields.getTextInputValue('new_order');
        const lines  = input.split('\n').map(l => l.trim()).filter(Boolean);
        const config = await StaffPanel.findOne({ guildId: interaction.guild.id });

        lines.forEach((roleId, i) => {
          const entry = config.roles.find(r => r.roleId === roleId);
          if (entry) entry.order = i;
        });
        config.markModified('roles');
        await config.save();
        await updateStaffPanel(client, interaction.guild.id);

        const menuEmbed = buildConfigMenuEmbed(config);
        return interaction.update({ embeds: [menuEmbed], components: buildConfigButtons() });
      }
    }
  });

  console.log('✅ Staff Manager initialized — fully customizable live panel');
}

module.exports = {
  initStaffManager,
  staffCommandsData,
  StaffPanel,
  buildStaffEmbed,
  updateStaffPanel,
};

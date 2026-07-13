const {
  Schema,
  model,
  models
} = require('mongoose');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

// ─── Schema ───────────────────────────────────────────────────────────────────
const WelcomeConfigSchema = new Schema({
  guildId:   { type: String, required: true, unique: true },
  channelId: { type: String, default: '' },
  title:     { type: String, default: '💎 A New Adventurer Has Arrived!' },
  description: { type: String, default: '' },
  color:     { type: String, default: '#9b59b6' },
  gifUrl:    { type: String, default: '' },
  bannerUrl: { type: String, default: '' }
});
const WelcomeConfig = models.WelcomeConfig || model('WelcomeConfig', WelcomeConfigSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ─── Canvas Card ──────────────────────────────────────────────────────────────
async function generateWelcomeCard(member) {
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');

  // Purple AmethMC theme
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1a0a2e');
  gradient.addColorStop(0.5, '#2d1a4e');
  gradient.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative amethyst particles
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(155, 89, 182, ${0.1 + Math.random() * 0.2})`;
    ctx.fillRect(x, y, size, size);
  }

  // Server name
  ctx.fillStyle = '#c39bd3';
  ctx.font = 'bold 36px "Minecraft", "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('💎 AMETHMC', 30, 40);

  ctx.fillStyle = '#d7bde2';
  ctx.font = '18px "Minecraft", "Courier New", monospace';
  ctx.fillText('⚔️ Survival Multiplayer', 30, 80);

  // Welcome text
  ctx.shadowColor = '#9b59b6';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Minecraft", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let displayName = member.user.username;
  if (displayName.length > 16) displayName = displayName.slice(0, 14) + '…';
  ctx.fillText(`Welcome, ${displayName}!`, canvas.width / 2, 130);
  ctx.shadowBlur = 0;

  // Member count
  ctx.fillStyle = '#c39bd3';
  ctx.font = '16px "Minecraft", "Courier New", monospace';
  ctx.fillText(`✦ Member #${member.guild.memberCount}`, canvas.width / 2, 175);

  // IP info
  ctx.fillStyle = 'rgba(155, 89, 182, 0.6)';
  ctx.font = '12px "Minecraft", "Courier New", monospace';
  ctx.fillText('🌐 play.amethmc.fun • 1.20.4+', canvas.width / 2, 215);

  // Avatar
  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatarX = canvas.width - 80;
    const avatarY = 50;
    const avatarSize = 60;

    // Avatar border
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#9b59b6';
    ctx.fill();

    // Avatar clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // Fallback if avatar fails to load
    ctx.beginPath();
    ctx.arc(canvas.width - 80, 50, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#4a2a5e';
    ctx.fill();
  }

  // Border glow
  ctx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  return canvas.toBuffer();
}

// ─── Embed Builder ────────────────────────────────────────────────────────────
// Single source of truth for all welcome embeds (live joins, retro blast, preview)
async function buildWelcomeEmbed(member, config, channelIds, memberNumber) {
  const { RULES_CHANNEL_ID, VERIFY_CHANNEL_ID, GENERAL_CHANNEL_ID } = channelIds;
  const count = memberNumber ?? member.guild.memberCount;

  const description =
`## <@${member.id}>!

We're excited to have you join **AMETHMC**. 💜

📖 **Read Rules** • <#${RULES_CHANNEL_ID || '1432277447440597028'}>
✅ **Verify** • <#${VERIFY_CHANNEL_ID || '1513364198850171010'}>
💬 **General** • <#${GENERAL_CHANNEL_ID || '1502596253589180457'}>

✨ You are our **${count}${getOrdinal(count)}** member!`;

  const embed = new EmbedBuilder()
    .setColor(config?.color ? parseInt(config.color.replace('#', ''), 16) : 0x9b59b6)
    .setTitle(config?.title || '💎 A New Adventurer Has Arrived!')
    .setDescription(description)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setFooter({ text: `AMETHMC • Member #${count}` })
    .setTimestamp();

  if (config?.bannerUrl) {
    embed.setImage(config.bannerUrl);
    return { embed, files: [] };
  }

  const cardBuffer = await generateWelcomeCard(member);
  const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });
  embed.setImage('attachment://welcome-card.png');
  return { embed, files: [attachment] };
}

// ─── Preview Helper ───────────────────────────────────────────────────────────
async function showPreviewWithCommitButtons(interaction, workingConfig, channelIds) {
  const { embed, files } = await buildWelcomeEmbed(
    interaction.member,
    workingConfig,
    channelIds
  );

  const commitActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('save_welcome_approved').setLabel('✅ Commit Changes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('save_welcome_rejected').setLabel('❌ Discard Changes').setStyle(ButtonStyle.Danger)
  );

  const bannerNote = workingConfig.bannerUrl
    ? `\n🖼️ **Banner active:** ${workingConfig.bannerUrl}`
    : '\n_(No banner set — canvas card will be used)_';

  await interaction.followUp({
    content: `📝 **Live Preview** — confirm before saving.${bannerNote}`,
    embeds: [embed],
    files,
    components: [commitActionRow],
    ephemeral: true
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initWelcomeManager(client, configDefaults) {
  // ─── FIX: Use the specific channel ID from configDefaults ──────────────────
  const WELCOME_CHANNEL_ID = configDefaults.WELCOME_CHANNEL_ID || '1526212463853572186';
  
  const {
    GUILD_ID,
    RULES_CHANNEL_ID,
    VERIFY_CHANNEL_ID,
    GENERAL_CHANNEL_ID
  } = configDefaults;

  const channelIds = { 
    RULES_CHANNEL_ID: RULES_CHANNEL_ID || '1432277447440597028', 
    VERIFY_CHANNEL_ID: VERIFY_CHANNEL_ID || '1513364198850171010', 
    GENERAL_CHANNEL_ID: GENERAL_CHANNEL_ID || '1502596253589180457' 
  };

  client.welcomeCache = new Map();

  // ── Live join handler ──────────────────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    let config = await WelcomeConfig.findOne({ guildId: member.guild.id });
    if (!config) {
      config = await WelcomeConfig.create({ 
        guildId: member.guild.id, 
        channelId: WELCOME_CHANNEL_ID 
      });
    }

    // ─── FIX: Use the stored channelId or fallback to the specified channel ───
    const channel = member.guild.channels.cache.get(config.channelId || WELCOME_CHANNEL_ID);
    if (!channel) {
      console.log(`[WelcomeManager] Channel ${config.channelId || WELCOME_CHANNEL_ID} not found`);
      return;
    }

    try {
      const { embed, files } = await buildWelcomeEmbed(member, config, channelIds);
      await channel.send({ embeds: [embed], files });
    } catch (err) {
      console.error('[WelcomeManager] guildMemberAdd error:', err);
    }
  });

  // ── Interaction handler ────────────────────────────────────────────────────
  client.on('interactionCreate', async (interaction) => {

    // ── Slash commands ───────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      // /welcomemsg — open the config menu
      if (commandName === 'welcomemsg') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Administrator permission required.', ephemeral: true });
        }

        let config = await WelcomeConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = await WelcomeConfig.create({ 
            guildId: interaction.guild.id, 
            channelId: WELCOME_CHANNEL_ID 
          });
        }

        const editMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('welcome_edit_property')
            .setPlaceholder('Pick a setting to configure...')
            .addOptions([
              { label: 'Embed Title',          description: 'Change the bold title at the top of the embed',        value: 'title'     },
              { label: 'Description Body',      description: 'Edit the main text (supports {member}, {count} etc.)', value: 'description' },
              { label: 'Accent Color',          description: 'Set the left-bar hex color e.g. #9b59b6',              value: 'color'     },
              { label: 'Output Channel',        description: 'Tag the channel where welcomes are sent',              value: 'channel'   },
              { label: '🖼️ Custom Banner',      description: 'Paste an image URL to use as the embed banner',        value: 'bannerUrl' },
              { label: '📤 Send Live Preview',  description: 'Fire a real test card to the welcome channel now',     value: 'preview'   }
            ])
        );

        return interaction.reply({
          content: '⚙️ **Welcome Config**\nPick a setting below.\nSupported placeholders: `{member}` `{username}` `{server}` `{count}` `{ordinal_count}`',
          components: [editMenu],
          ephemeral: true
        });
      }

      // /startwelcomemsg — retroactive blast for all existing members
      if (commandName === 'startwelcomemsg') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Administrator permission required.', ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Sending welcome cards for all members... Check your welcome channel.', ephemeral: true });

        const config = await WelcomeConfig.findOne({ guildId: interaction.guild.id });
        const targetChannel = interaction.guild.channels.cache.get(config?.channelId || WELCOME_CHANNEL_ID);

        if (!targetChannel) {
          return interaction.followUp({ content: '❌ Welcome channel not found.', ephemeral: true });
        }

        try {
          const allMembers = await interaction.guild.members.fetch();
          const humanMembers = Array.from(allMembers.filter(m => !m.user.bot).values());

          for (let i = 0; i < humanMembers.length; i++) {
            const { embed, files } = await buildWelcomeEmbed(humanMembers[i], config, channelIds, i + 1);
            await targetChannel.send({ embeds: [embed], files });
            await new Promise(res => setTimeout(res, 1200));
          }
          await interaction.followUp({ content: `✅ Sent ${humanMembers.length} welcome messages!`, ephemeral: true });
        } catch (err) {
          console.error('[WelcomeManager] startwelcomemsg error:', err);
          await interaction.followUp({ content: '❌ Error sending welcome messages.', ephemeral: true });
        }
        return;
      }
    }

    // ── Select menu ──────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'welcome_edit_property') {
      const chosen = interaction.values[0];

      let workingConfig = await WelcomeConfig.findOne({ guildId: interaction.guild.id });
      if (!workingConfig) workingConfig = new WelcomeConfig({ guildId: interaction.guild.id });

      // Option: send live preview now (no input needed)
      if (chosen === 'preview') {
        await interaction.reply({
          content: '⏳ Sending preview to your welcome channel...',
          ephemeral: true
        });

        const previewChannel = interaction.guild.channels.cache.get(
          workingConfig?.channelId || WELCOME_CHANNEL_ID
        );

        if (!previewChannel) {
          return interaction.followUp({
            content: '❌ No welcome channel set. Use "Output Channel" first.',
            ephemeral: true
          });
        }

        try {
          const { embed, files } = await buildWelcomeEmbed(interaction.member, workingConfig, channelIds);
          await previewChannel.send({ embeds: [embed], files });
          return interaction.followUp({
            content: `✅ Preview sent to <#${previewChannel.id}>!`,
            ephemeral: true
          });
        } catch (err) {
          console.error('[WelcomeManager] preview error:', err);
          return interaction.followUp({ content: '❌ Failed to send preview. Check bot permissions.', ephemeral: true });
        }
      }

      // Option: banner URL input
      if (chosen === 'bannerUrl') {
        await interaction.reply({
          content: '🖼️ **Custom Banner**\nPaste a direct image URL (`.png` `.jpg` `.gif`). Type `remove` to clear.\n_(60s timeout)_',
          ephemeral: true
        });

        const collector = interaction.channel.createMessageCollector({
          filter: m => m.author.id === interaction.user.id,
          max: 1,
          time: 60_000
        });

        collector.on('collect', async (msg) => {
          const input = msg.content.trim();
          try { await msg.delete(); } catch {}

          if (input.toLowerCase() === 'remove') {
            workingConfig.bannerUrl = '';
          } else if (!input.startsWith('http')) {
            return interaction.followUp({ content: '❌ Invalid URL — must start with `http`.', ephemeral: true });
          } else {
            workingConfig.bannerUrl = input;
          }

          client.welcomeCache.set(interaction.user.id, workingConfig);
          await showPreviewWithCommitButtons(interaction, workingConfig, channelIds);
        });

        collector.on('end', collected => {
          if (collected.size === 0) {
            interaction.followUp({ content: '⏱️ Timed out. No changes made.', ephemeral: true }).catch(() => {});
          }
        });
        return;
      }

      // All other options: text/channel input
      await interaction.reply({
        content: `💬 Type your new value for **${chosen.toUpperCase()}** in this channel. (60s timeout)`,
        ephemeral: true
      });

      const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === interaction.user.id,
        max: 1,
        time: 60_000
      });

      collector.on('collect', async (msg) => {
        let value = msg.content.trim();
        try { await msg.delete(); } catch {}

        if (chosen === 'channel') {
          const mentioned = msg.mentions.channels.first();
          if (!mentioned) {
            return interaction.followUp({
              content: '❌ You must tag a channel with `#channel-name`.',
              ephemeral: true
            });
          }
          value = mentioned.id;
        }

        workingConfig[chosen] = value;
        client.welcomeCache.set(interaction.user.id, workingConfig);
        await showPreviewWithCommitButtons(interaction, workingConfig, channelIds);
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.followUp({ content: '⏱️ Timed out. No changes made.', ephemeral: true }).catch(() => {});
        }
      });
      return;
    }

    // ── Buttons ──────────────────────────────────────────────────────────────
    if (interaction.isButton()) {

      if (interaction.customId === 'save_welcome_approved') {
        const cached = client.welcomeCache.get(interaction.user.id);
        if (!cached) {
          return interaction.reply({ content: '❌ Session expired. Re-run `/welcomemsg`.', ephemeral: true });
        }

        const updatePayload = {
          title:     cached.title,
          description: cached.description,
          color:     cached.color,
          channelId: cached.channelId,
          bannerUrl: cached.bannerUrl,
          gifUrl:    cached.gifUrl
        };

        await WelcomeConfig.findOneAndUpdate(
          { guildId: interaction.guild.id },
          { $set: updatePayload },
          { upsert: true, new: true }
        );

        client.welcomeCache.delete(interaction.user.id);
        return interaction.update({
          content: '✅ **Changes saved!** New settings are live.',
          embeds: [],
          components: []
        });
      }

      if (interaction.customId === 'save_welcome_rejected') {
        client.welcomeCache.delete(interaction.user.id);
        return interaction.update({
          content: '❌ **Discarded.** No changes were saved.',
          embeds: [],
          components: []
        });
      }
    }
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────
const welcomeCommandsData = [
  new SlashCommandBuilder()
    .setName('welcomemsg')
    .setDescription('Configure the server welcome message'),
  new SlashCommandBuilder()
    .setName('startwelcomemsg')
    .setDescription('Send welcome cards for all existing members')
];

module.exports = { initWelcomeManager, welcomeCommandsData };

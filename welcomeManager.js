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

// 1. Database Schema with Cache Protection
const WelcomeConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: '' },
  title: { type: String, default: '🎉 A New Adventurer Has Arrived!' },
  description: { type: String, default: '## 💛 Welcome, {member}!\n\nWe\'re excited to have you join **Golden Heart SMP**.\n\n📖 **Read Rules** • <#123456789012345678>\n✅ **Verify** • <#123456789012345678>\n💬 **General** • <#123456789012345678>\n\n✨ You are our **{ordinal_count}** member!' },
  color: { type: String, default: '#FFD700' },
  gifUrl: { type: String, default: '' },
  bannerUrl: { type: String, default: '' }  // NEW: custom banner image URL
});
const WelcomeConfig = models.WelcomeConfig || model('WelcomeConfig', WelcomeConfigSchema);

// 2. Helpers
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function parseWelcomePlaceholders(text, member) {
  if (!text) return '';
  return text
    .replace(/{member}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{count}/g, member.guild.memberCount)
    .replace(/{ordinal_count}/g, `${member.guild.memberCount}${getOrdinal(member.guild.memberCount)}`);
}

// Generates a clean square portrait canvas buffer
async function generateWelcomeCard(member) {
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 450, 25, 200, 200);
  } catch {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(450, 25, 200, 200);
  }

  return canvas.toBuffer();
}

// NEW: Shared embed builder — used by both live joins and the final output preview
async function buildWelcomeEmbed(member, config, channelIds, memberNumber) {
  const { RULES_CHANNEL_ID, VERIFY_CHANNEL_ID, GENERAL_CHANNEL_ID } = channelIds;
  const count = memberNumber ?? member.guild.memberCount;

  const cardBuffer = await generateWelcomeCard(member);
  const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });

  const embed = new EmbedBuilder()
    .setColor(config?.color ? parseInt(config.color.replace('#', ''), 16) : 0xFFD700)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setTitle(config?.title || '🎉 A New Adventurer Has Arrived!')
    .setDescription(
`**<@${member.id}>!**

We're excited to have you join **Golden Heart SMP**.

📖 **Read Rules** • <#${RULES_CHANNEL_ID || '123456789012345678'}>
✅ **Verify** • <#${VERIFY_CHANNEL_ID || '123456789012345678'}>
💬 **General** • <#${GENERAL_CHANNEL_ID || '123456789012345678'}>

✨ You are our **${count}${getOrdinal(count)}** member!`
    )
    .setImage('attachment://welcome-card.png')
    .setFooter({ text: `Timing | GoldenHeart SMP • Member #${count}` })
    .setTimestamp();

  // NEW: Attach custom banner as a second image field if configured
  // Discord embeds only support one image; we use the banner as the main image
  // and the generated card as thumbnail when a banner is set.
  if (config?.bannerUrl) {
    embed.setImage(config.bannerUrl);
    embed.setThumbnail(member.user.displayAvatarURL({ size: 512 }));
    // Card is still generated but used as thumbnail fallback — skip attaching it
    return { embed, files: [] };
  }

  return { embed, files: [attachment] };
}

// 3. Initialization Routine
function initWelcomeManager(client, configDefaults) {
  const { GUILD_ID, WELCOME_CHANNEL_ID, RULES_CHANNEL_ID, VERIFY_CHANNEL_ID, GENERAL_CHANNEL_ID } = configDefaults;
  const channelIds = { RULES_CHANNEL_ID, VERIFY_CHANNEL_ID, GENERAL_CHANNEL_ID };

  client.welcomeCache = new Map();

  // Arrival tracking handler
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    let config = await WelcomeConfig.findOne({ guildId: member.guild.id });
    if (!config) {
      config = await WelcomeConfig.create({ guildId: member.guild.id, channelId: WELCOME_CHANNEL_ID });
    }

    const outputChannelId = config.channelId || WELCOME_CHANNEL_ID;
    const channel = member.guild.channels.cache.get(outputChannelId);
    if (!channel) return;

    try {
      const { embed, files } = await buildWelcomeEmbed(member, config, channelIds);
      await channel.send({ embeds: [embed], files });
    } catch (err) {
      console.error('Error outputting custom dynamic join greeting:', err);
    }
  });

  // Interaction configuration engine
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'welcomemsg') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ You must be an Administrator to run this.', ephemeral: true });
        }

        let config = await WelcomeConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = await WelcomeConfig.create({ guildId: interaction.guild.id, channelId: WELCOME_CHANNEL_ID });
        }

        const editMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('welcome_edit_property')
            .setPlaceholder('Pick a variable configuration target...')
            .addOptions([
              { label: 'Embed Title Block', description: 'Modify the primary embed description header line', value: 'title' },
              { label: 'Main Description Body', description: 'Modify variables, descriptive content, or hyperlinks', value: 'description' },
              { label: 'Theme Frame Hex Color', description: 'Supply custom accent canvas hex structures', value: 'color' },
              { label: 'Output Channel Location', description: 'Change active arrival tracking destinations', value: 'channel' },
              // NEW OPTIONS ↓
              { label: '🖼️ Custom Banner Image', description: 'Set a banner image URL shown at the top of the welcome embed', value: 'bannerUrl' },
              { label: '📤 Send Final Output Preview', description: 'Fire a live test welcome card to your configured welcome channel', value: 'preview' }
            ])
        );

        return interaction.reply({
          content: '⚙️ **Welcome Canvas Embed Customizer Editor Engine**\nChoose structural options below to run adjustments. You can inject dynamic tags: `{member}`, `{username}`, `{server}`, `{count}`, `{ordinal_count}` inside lines.',
          components: [editMenu],
          ephemeral: true
        });
      }

      if (commandName === 'startwelcomemsg') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Administrator permissions required.', ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Fetching guild registers and rendering retroactive graphics cards... Please check your output welcome channel.', ephemeral: true });

        let config = await WelcomeConfig.findOne({ guildId: interaction.guild.id });
        const currentChannelTarget = config?.channelId || WELCOME_CHANNEL_ID;
        const targetChannel = interaction.guild.channels.cache.get(currentChannelTarget);

        if (!targetChannel) {
          return interaction.followUp({ content: '❌ Outbound greeting channel location unresolvable.', ephemeral: true });
        }

        try {
          const structuralGuildMembers = await interaction.guild.members.fetch();
          const physicalMembersList = Array.from(structuralGuildMembers.filter(m => !m.user.bot).values());

          for (let index = 0; index < physicalMembersList.length; index++) {
            const member = physicalMembersList[index];
            const currentCountNumber = index + 1;

            const { embed, files } = await buildWelcomeEmbed(member, config, channelIds, currentCountNumber);
            await targetChannel.send({ embeds: [embed], files });

            await new Promise(res => setTimeout(res, 1200));
          }
        } catch (err) {
          console.error('Error on retrospective launch loop logic:', err);
        }
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'welcome_edit_property') {
      const chosenVariable = interaction.values[0];
      let workingConfig = await WelcomeConfig.findOne({ guildId: interaction.guild.id });
      if (!workingConfig) workingConfig = new WelcomeConfig({ guildId: interaction.guild.id });

      // NEW: Final Output Preview — sends a live test card directly to the welcome channel
      if (chosenVariable === 'preview') {
        await interaction.reply({
          content: '⏳ Generating and sending your final welcome card preview to the configured welcome channel...',
          ephemeral: true
        });

        const previewChannelId = workingConfig?.channelId || WELCOME_CHANNEL_ID;
        const previewChannel = interaction.guild.channels.cache.get(previewChannelId);

        if (!previewChannel) {
          return interaction.followUp({ content: '❌ Welcome channel not found. Set one first using "Output Channel Location".', ephemeral: true });
        }

        try {
          const { embed, files } = await buildWelcomeEmbed(interaction.member, workingConfig, channelIds);
          await previewChannel.send({ embeds: [embed], files });
          return interaction.followUp({
            content: `✅ **Preview sent!** Check <#${previewChannelId}> to see exactly how your welcome card will look.`,
            ephemeral: true
          });
        } catch (err) {
          console.error('Preview send error:', err);
          return interaction.followUp({ content: '❌ Failed to send preview. Check bot permissions in the welcome channel.', ephemeral: true });
        }
      }

      // NEW: Banner URL — validates it looks like a URL before saving
      if (chosenVariable === 'bannerUrl') {
        await interaction.reply({
          content: `🖼️ **Custom Banner Setup**\nPaste the **direct image URL** for your banner (must end in \`.png\`, \`.jpg\`, \`.gif\`, or be a CDN link). Type \`remove\` to clear the current banner.\n\n_(Auto expires in 60s)_`,
          ephemeral: true
        });

        const collectorFilter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, max: 1, time: 60000 });

        collector.on('collect', async (msg) => {
          const input = msg.content.trim();
          try { await msg.delete(); } catch {}

          if (input.toLowerCase() === 'remove') {
            workingConfig.bannerUrl = '';
          } else if (!input.startsWith('http')) {
            return interaction.followUp({ content: '❌ Invalid URL. Must start with `http`. Session ended.', ephemeral: true });
          } else {
            workingConfig.bannerUrl = input;
          }

          client.welcomeCache.set(interaction.user.id, workingConfig);
          await showPreviewWithCommitButtons(interaction, workingConfig, channelIds, WELCOME_CHANNEL_ID);
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.followUp({ content: '⏱️ Banner input timed out. No changes made.', ephemeral: true }).catch(() => {});
          }
        });
        return;
      }

      // Default text/channel input collector (existing fields)
      await interaction.reply({
        content: `💬 **Input Watcher Engaged**\nPlease type your new value text content for the welcome **${chosenVariable.toUpperCase()}** parameters directly in this channel context. (Auto expires in 60s).`,
        ephemeral: true
      });

      const collectorFilter = m => m.author.id === interaction.user.id;
      const userMessageCollector = interaction.channel.createMessageCollector({ filter: collectorFilter, max: 1, time: 60000 });

      userMessageCollector.on('collect', async (collectedMsg) => {
        let refinedContent = collectedMsg.content.trim();
        try { await collectedMsg.delete(); } catch {}

        if (chosenVariable === 'channel') {
          const mentionCheck = collectedMsg.mentions.channels.first();
          if (!mentionCheck) {
            return interaction.followUp({ content: '❌ Extraction failed. You must cleanly tag a text target channel (`#channel`). Session broken.', ephemeral: true });
          }
          refinedContent = mentionCheck.id;
        }

        workingConfig[chosenVariable] = refinedContent;
        client.welcomeCache.set(interaction.user.id, workingConfig);
        await showPreviewWithCommitButtons(interaction, workingConfig, channelIds, WELCOME_CHANNEL_ID);
      });

      userMessageCollector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp({ content: '⏱️ Input timed out. No changes made.', ephemeral: true }).catch(() => {});
        }
      });
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'save_welcome_approved') {
        const activeState = client.welcomeCache.get(interaction.user.id);
        if (!activeState) return interaction.reply({ content: '❌ Modification transaction context was lost. Re-run selection setup.', ephemeral: true });

        await WelcomeConfig.findOneAndUpdate({ guildId: interaction.guild.id }, activeState.toObject(), { upsert: true });
        client.welcomeCache.delete(interaction.user.id);

        return interaction.update({ content: '✅ **Configuration successfully updated and committed to Cluster!**', embeds: [], components: [] });
      }

      if (interaction.customId === 'save_welcome_rejected') {
        client.welcomeCache.delete(interaction.user.id);
        return interaction.update({ content: '❌ **Modifications cleared out.** Cache context dropped.', embeds: [], components: [] });
      }
    }
  });
}

// NEW: Shared helper — shows the live preview embed + Commit/Discard buttons
async function showPreviewWithCommitButtons(interaction, workingConfig, channelIds, fallbackChannelId) {
  const { RULES_CHANNEL_ID, VERIFY_CHANNEL_ID, GENERAL_CHANNEL_ID } = channelIds;

  const previewEmbed = new EmbedBuilder()
    .setColor(workingConfig.color ? parseInt(workingConfig.color.replace('#', ''), 16) : 0xFFD700)
    .setThumbnail(interaction.member.user.displayAvatarURL({ size: 512 }))
    .setTitle(workingConfig.title || '🎉 A New Adventurer Has Arrived!')
    .setDescription(
`## 💛 Welcome, <@${interaction.member.id}>!

We're excited to have you join **Golden Heart SMP**.

✅ **Verify** • <#${1513364198850171010 || '123456789012345678'}>
📖 **Read Rules** • <#${1432277447440597028 || '123456789012345678'}>
💬 **General** • <#${1502596253589180457 || '123456789012345678'}>

✨ You are our **${interaction.guild.memberCount}${getOrdinal(interaction.guild.memberCount)}** member!`
    )
    .setFooter({ text: 'Timing | GoldenHeart SMP' });

  // Show banner in preview if set
  if (workingConfig.bannerUrl) {
    previewEmbed.setImage(workingConfig.bannerUrl);
  }

  const commitActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('save_welcome_approved').setLabel('Commit Changes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('save_welcome_rejected').setLabel('Discard Changes').setStyle(ButtonStyle.Danger)
  );

  const bannerNote = workingConfig.bannerUrl
    ? `\n🖼️ **Banner set:** ${workingConfig.bannerUrl}`
    : '\n_(No custom banner set — generated card will be used)_';

  await interaction.followUp({
    content: `📝 **Live System Preview Rendering Canvas:** Ensure look structure formats align correctly before global deployment.${bannerNote}`,
    embeds: [previewEmbed],
    components: [commitActionRow],
    ephemeral: true
  });
}

// 4. Command Registries exports
const welcomeCommandsData = [
  new SlashCommandBuilder().setName('welcomemsg').setDescription('Manage or alter configurations for the server greeting layout'),
  new SlashCommandBuilder().setName('startwelcomemsg').setDescription('Retroactively post greeting cards for all current server members')
];

module.exports = { initWelcomeManager, welcomeCommandsData };

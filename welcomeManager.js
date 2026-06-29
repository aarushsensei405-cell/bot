const {
  Mongoose,
  Schema,
  model
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

// 1. Database Schema
const WelcomeConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: '' },
  title: { type: String, default: '🏰 Welcome to GoldenHeart SMP' },
  description: { type: String, default: 'Hey {member}, we\'re glad you\'re here! 💛\n\nGoldenHeart SMP is a community-driven Minecraft survival server built on friendship, strategy, and epic adventures.' },
  color: { type: String, default: '#f0b429' },
});
const WelcomeConfig = model('WelcomeConfig', WelcomeConfigSchema);

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

async function generateWelcomeCard(member) {
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f0b429';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('WELCOME TO GOLDENHEART', 220, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px sans-serif';
  ctx.fillText(member.user.username.toUpperCase(), 220, 130);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Member #${member.guild.memberCount}`, 220, 170);

  ctx.beginPath();
  ctx.arc(110, 125, 60, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 50, 65, 120, 120);
  } catch {
    ctx.fillStyle = '#555555';
    ctx.fillRect(50, 65, 120, 120);
  }
  return canvas.toBuffer();
}

// 3. Export initialization routine to main file
function initWelcomeManager(client, configDefaults) {
  const { GUILD_ID, WELCOME_CHANNEL_ID } = configDefaults;

  // Cache for handling interaction updates locally before DB publish
  client.welcomeCache = new Map();

  // Listen for real-time arrivals
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
      const cardBuffer = await generateWelcomeCard(member);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });

      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.color.startsWith('#') ? config.color : 0xf0b429)
        .setAuthor({
          name: `⛏️ ${member.user.username} joined GoldenHeart SMP!`,
          iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
        })
        .setTitle(parseWelcomePlaceholders(config.title, member))
        .setDescription(parseWelcomePlaceholders(config.description, member))
        .setImage('attachment://welcome-card.png')
        .setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }) || member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `⚔️ GoldenHeart SMP • ${member.guild.memberCount} members` })
        .setTimestamp();

      await channel.send({
        content: `🎉 **Welcome <@${member.id}>!** You are our **${member.guild.memberCount}${getOrdinal(member.guild.memberCount)}** member!`,
        embeds: [welcomeEmbed],
        files: [attachment]
      });
    } catch (err) {
      console.error('Error outputting custom dynamic join greeting:', err);
    }
  });

  // Listen for interaction configurations
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
              { label: 'Output Channel Location', description: 'Change active arrival tracking destinations', value: 'channel' }
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
          const physicalMembersList = structuralGuildMembers.filter(m => !m.user.bot);

          for (const [id, member] of physicalMembersList) {
            const buffer = await generateWelcomeCard(member);
            const attachFile = new AttachmentBuilder(buffer, { name: 'welcome-card.png' });

            const retroEmbed = new EmbedBuilder()
              .setColor(config?.color || 0xf0b429)
              .setAuthor({ name: `⛏️ ${member.user.username} joined!`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
              .setTitle(parseWelcomePlaceholders(config?.title || '🏰 Welcome to GoldenHeart SMP', member))
              .setDescription(parseWelcomePlaceholders(config?.description || 'Hey {member}, welcome!', member))
              .setImage('attachment://welcome-card.png')
              .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || member.user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            await targetChannel.send({
              content: `🎉 **Welcome <@${member.id}>!**`,
              embeds: [retroEmbed],
              files: [attachFile]
            });

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

        const livePreview = new EmbedBuilder()
          .setColor(workingConfig.color.startsWith('#') ? workingConfig.color : 0xf0b429)
          .setTitle(parseWelcomePlaceholders(workingConfig.title, interaction.member))
          .setDescription(parseWelcomePlaceholders(workingConfig.description, interaction.member))
          .addFields({ name: '📢 Output Location Configuration Target', value: `<#${workingConfig.channelId || WELCOME_CHANNEL_ID}>` })
          .setFooter({ text: 'Preview Simulation Grid — Confirm options using the control triggers below.' });

        const commitActionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('save_welcome_approved').setLabel('Commit Changes').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('save_welcome_rejected').setLabel('Discard Changes').setStyle(ButtonStyle.Danger)
        );

        await interaction.followUp({
          content: '📝 **Live System Preview Rendering Canvas:** Ensure look structure formats align correctly before global deployment:',
          embeds: [livePreview],
          components: [commitActionRow],
          ephemeral: true
        });
      });
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'save_welcome_approved') {
        const activeState = client.welcomeCache.get(interaction.user.id);
        if (!activeState) return interaction.reply({ content: '❌ Modification transaction context was lost. re-run selection setup.', ephemeral: true });

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

// 4. Command Registries exports
const welcomeCommandsData = [
  new SlashCommandBuilder().setName('welcomemsg').setDescription('Manage or alter configurations for the server greeting layout'),
  new SlashCommandBuilder().setName('startwelcomemsg').setDescription('Retroactively post greeting cards for all current server members')
];

module.exports = { initWelcomeManager, welcomeCommandsData };

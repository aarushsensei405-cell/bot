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
  title: { type: String, default: '🏰 Welcome to GoldenHeart SMP' },
  description: { type: String, default: 'Hey {member}, we\'re glad you\'re here! 💛\n\nGoldenHeart SMP is a community-driven Minecraft survival server built on friendship, strategy, and epic adventures.' },
  color: { type: String, default: '#f0b429' },
  gifUrl: { type: String, default: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2N2pqOHFwYm9pZ3p4ZHpjdHpxZms0Ym9pN2pxZms0Ym9pN2pxZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L3X9Gv1jdK4Ew/giphy.gif' }
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

// Generates a clean square portrait container on the right side
async function generateWelcomeCard(member) {
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
  
  // Background canvas structure
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Modern Right-Aligned Square Profile Image Frame
  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 450, 25, 200, 200);
  } catch {
    ctx.fillStyle = '#f0b429';
    ctx.fillRect(450, 25, 200, 200);
  }
  
  return canvas.toBuffer();
}

// 3. Initialization Routine
function initWelcomeManager(client, configDefaults) {
  const { GUILD_ID, WELCOME_CHANNEL_ID } = configDefaults;
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
      const cardBuffer = await generateWelcomeCard(member);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });

      // Embed config with removed author avatar icon and added dynamic layout spacing
      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.color.startsWith('#') ? config.color : 0xf0b429)
        .setAuthor({
          name: `${member.user.username} has joined GoldenHeart SMP!` // Removed iconURL property
        })
        .setTitle(parseWelcomePlaceholders(config.title, member))
        // Added "\n\n" below to create clean vertical breathing space before description text block
        .setDescription(`\n\n${parseWelcomePlaceholders(config.description, member)}`)
        .setThumbnail('attachment://welcome-card.png') 
        .setImage(config.gifUrl) 
        .setFooter({ text: `Timing | GoldenHeart SMP • Member #${member.guild.memberCount}` })
        .setTimestamp();

      await channel.send({
        embeds: [welcomeEmbed],
        files: [attachment]
      });
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
              { label: 'Animated Footer GIF Url', description: 'Add or change the bottom animated GIF banner', value: 'gifUrl' }
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

            const buffer = await generateWelcomeCard(member);
            const attachFile = new AttachmentBuilder(buffer, { name: 'welcome-card.png' });

            const retroEmbed = new EmbedBuilder()
              .setColor(config?.color || 0xf0b429)
              .setAuthor({ name: `${member.user.username} has joined GoldenHeart SMP!` })
              .setTitle(parseWelcomePlaceholders(config?.title || '🏰 Welcome to GoldenHeart SMP', member))
              .setDescription(`\n\n${parseWelcomePlaceholders(config?.description || 'Hey {member}, welcome!', member)}`)
              .setThumbnail('attachment://welcome-card.png')
              .setImage(config?.gifUrl || 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2N2pqOHFwYm9pZ3p4ZHpjdHpxZms0Ym9pN2pxZms0Ym9pN2pxZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L3X9Gv1jdK4Ew/giphy.gif')
              .setFooter({ text: `Timing | GoldenHeart SMP • Member #${currentCountNumber}` })
              .setTimestamp();

            await targetChannel.send({
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
          .setDescription(`\n\n${parseWelcomePlaceholders(workingConfig.description, interaction.member)}`)
          .setImage(workingConfig.gifUrl)
          .addFields({ name: '📢 Output Location Configuration Target', value: `<#${workingConfig.channelId || WELCOME_CHANNEL_ID}>` })
          .setFooter({ text: 'Timing | GoldenHeart SMP' });

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

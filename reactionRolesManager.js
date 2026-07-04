// reactionRolesManager.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

// ─────────────────────────────────────────
// ROLE CONFIGURATION
// ─────────────────────────────────────────
const ROLES = {
  // Colors
  red: '1432277417572962326',
  blue: '1432277417103327343',
  green: '1432277419498143785',
  purple: '1432277418521137269',
  pink: '1432277421582975027',
  
  // Age
  under18: '1432277422606389288',
  over18: '1432277423470149722',
  
  // Platform
  pc: '1432277424304951366',
  mobile: '1432277425726685224',
};

// Map each role ID to its specific emoji for custom response messages
const ROLE_EMOJIS = {
  ['1432277417572962326']: '🔴', // Red
  ['1432277417103327343']: '🔵', // Blue
  ['1432277419498143785']: '🟢', // Green
  ['1432277418521137269']: '🟣', // Purple
  ['1432277421582975027']: '🌸', // Pink
  ['1432277422606389288']: '🌱', // Under 18
  ['1432277423470149722']: '🌳', // 18 or Older
  ['1432277424304951366']: '💻', // PC
  ['1432277425726685224']: '📱', // Mobile
};

const rrCommandsData = [
  new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('Spawns the elegant step-by-step role profile setup.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

async function handleRRSetup(interaction) {
  // Upgraded, sleek, high-energy prompt text
  const textMessage = [
    '⚡ **Ready to lock in your identity on GoldenHeart SMP?**',
    'Click the panel below to design your profile line-up and secure your signature chat color.',
    'Claim your attributes instantly so the community knows exactly who you are!',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  ].join('\n');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rr_open_menu')
      .setLabel('🎨 Personalize Profile')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ content: '✅ Role menu deployed successfully!', ephemeral: true });
  await interaction.channel.send({ content: textMessage, components: [row] });
}

// ─────────────────────────────────────────
// INTERACTION HANDLERS
// ─────────────────────────────────────────
async function handleRRInteraction(interaction) {
  
  // When they click the main "Personalize Profile" button
  if (interaction.isButton() && interaction.customId === 'rr_open_menu') {
    
    await interaction.deferReply({ ephemeral: true });

    // ─── EMBED & ROW 1: COLORS ───
    const embedColor = new EmbedBuilder()
      .setTitle('🎨 Question 1: Choose Your Name Color')
      .setDescription('Select your signature profile color to stand out in the chat!')
      .setColor(0x2b2d31);

    const colorRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.red}`).setLabel('Red').setEmoji('🔴').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.blue}`).setLabel('Blue').setEmoji('🔵').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.green}`).setLabel('Green').setEmoji('🟢').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.purple}`).setLabel('Purple').setEmoji('🟣').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pink}`).setLabel('Pink').setEmoji('🌸').setStyle(ButtonStyle.Secondary)
    );

    // ─── EMBED & ROW 2: AGE ───
    const embedAge = new EmbedBuilder()
      .setTitle('🎂 Question 2: Select Your Age Group')
      .setDescription('Let us know your general age bracket demographic.')
      .setColor(0x2b2d31);

    const ageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.under18}`).setLabel('Under 18').setEmoji('🌱').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.over18}`).setLabel('18 or Older').setEmoji('🌳').setStyle(ButtonStyle.Primary)
    );

    // ─── EMBED & ROW 3: PLATFORM ───
    const embedPlatform = new EmbedBuilder()
      .setTitle('🎮 Question 3: What Do You Play On?')
      .setDescription('What primary operational gaming device do you use to explore the SMP?')
      .setColor(0x2b2d31)
      .setFooter({ text: '💡 Click any button once to add a role, and click again to remove it!' });

    const platformRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pc}`).setLabel('PC Player').setEmoji('💻').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.mobile}`).setLabel('Mobile Player').setEmoji('📱').setStyle(ButtonStyle.Secondary)
    );

    // 1st message: Edits the initial defer hook
    await interaction.editReply({
      embeds: [embedColor],
      components: [colorRow]
    });

    // 2nd message: Drops cleanly underneath it
    await interaction.followUp({
      embeds: [embedAge],
      components: [ageRow],
      ephemeral: true
    });

    // 3rd message: Concludes the block layout underneath it
    return interaction.followUp({
      embeds: [embedPlatform],
      components: [platformRow],
      ephemeral: true
    });
  }

  // Handle actual profile role toggling actions
  if (interaction.isButton() && interaction.customId.startsWith('rr_btn_')) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleId = interaction.customId.replace('rr_btn_', '');
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.editReply({ content: '❌ Role configuration error: Role missing from Discord server settings.' });
    }

    // Grab the emoji associated with this role ID (defaults to label badge if none found)
    const associatedEmoji = ROLE_EMOJIS[roleId] || '🏷️';

    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({ content: `🗑️ Removed: ${associatedEmoji} **${role.name} role removed**` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✨ Added: ${associatedEmoji} **${role.name} color role added**` });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ Error: Make sure my bot role is higher than the roles I am assigning in server settings.' });
    }
  }
}

module.exports = {
  rrCommandsData,
  handleRRSetup,
  handleRRInteraction
};

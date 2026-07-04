// reactionRolesManager.js
const {
  SlashCommandBuilder,
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

const rrCommandsData = [
  new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('Spawns the simple text profile role setup.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

async function handleRRSetup(interaction) {
  // Simple, normal 3-4 line text message
  const textMessage = [
    'Hey! Wanna personalize your profile settings and stand out in the server?',
    'Click the button below to choose your favorite roles instantly.',
    'It only takes a second and helps everyone get to know you better!',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  ].join('\n');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rr_open_menu')
      .setLabel('🎨 Personalize Profile')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ content: '✅ Text menu deployed!', ephemeral: true });
  await interaction.channel.send({ content: textMessage, components: [row] });
}

// ─────────────────────────────────────────
// INTERACTION HANDLERS
// ─────────────────────────────────────────
async function handleRRInteraction(interaction) {
  
  // When they click the main "Personalize Profile" button
  if (interaction.isButton() && interaction.customId === 'rr_open_menu') {
    
    // Question 1: Colors (Using color-coded button styles)
    const colorRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.red}`).setLabel('Red').setEmoji('🔴').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.blue}`).setLabel('Blue').setEmoji('🔵').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.green}`).setLabel('Green').setEmoji('🟢').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.purple}`).setLabel('Purple').setEmoji('🟣').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pink}`).setLabel('Pink').setEmoji('🌸').setStyle(ButtonStyle.Secondary)
    );

    // Question 2: Age
    const ageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.under18}`).setLabel('Under 18').setEmoji('🌱').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.over18}`).setLabel('18 or Older').setEmoji('🌳').setStyle(ButtonStyle.Primary)
    );

    // Question 3: Platform
    const platformRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pc}`).setLabel('PC Player').setEmoji('💻').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rr_btn_${ROLES.mobile}`).setLabel('Mobile Player').setEmoji('📱').setStyle(ButtonStyle.Secondary)
    );

    // Send everything privately to the user who clicked it
    return interaction.reply({
      content: [
        '**Question 1:** Select your signature profile color below!',
        '**Question 2:** Select your current age demographic group.',
        '**Question 3:** What gaming device do you play on?',
        '*(Click a button once to add, click again to remove)*'
      ].join('\n'),
      components: [colorRow, ageRow, platformRow],
      ephemeral: true
    });
  }

  // Handle actual profile role buttons
  if (interaction.isButton() && interaction.customId.startsWith('rr_btn_')) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleId = interaction.customId.replace('rr_btn_', '');
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.editReply({ content: '❌ Role config error: Role missing from Discord.' });
    }

    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({ content: `🗑️ Removed: **${role.name}**` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✨ Added: **${role.name}**` });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ Error: Make sure my bot role is higher than the roles I am assigning.' });
    }
  }
}

module.exports = {
  rrCommandsData,
  handleRRSetup,
  handleRRInteraction
};

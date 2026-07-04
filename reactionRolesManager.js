// reactionRolesManager.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits
} = require('discord.js');

// ─────────────────────────────────────────
// ROLE CONFIGURATION (REPLACE WITH YOUR IDs)
// ─────────────────────────────────────────
const ROLES = {
  // Colors
  red: '111111111111111111',
  blue: '222222222222222222',
  green: '333333333333333333',
  purple: '444444444444444444',
  pink: '555555555555555555',
  
  // Age
  under18: '666666666666666666',
  over18: '777777777777777777',
  
  // Platform
  pc: '888888888888888888',
  mobile: '999999999999999999',
};

const rrCommandsData = [
  new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('Spawns the fancy reaction roles menu.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Admin only
];

async function handleRRSetup(interaction) {
  // 1. The Fancy Embed
  const embed = new EmbedBuilder()
    .setTitle('✨ Personalize Your Profile ✨')
    .setDescription([
      'Welcome to the role assignment desk! Customize how you appear in the server by selecting your preferences below.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🎨 **Favourite Color**',
      'Use the dropdown menu to select your favourite color. You can choose up to 3!',
      '',
      '🎂 **Age Group**',
      'Click the buttons to let us know your age group.',
      '',
      '🎮 **Platform**',
      'How do you play? Select your primary gaming devices!',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '*Roles are togglable. Click/Select again to remove a role.*'
    ].join('\n'))
    .setColor(0x2b2d31) // Discord dark theme matching color
    .setImage('https://i.imgur.com/8Q853f2.gif') // Optional: A nice aesthetic divider gif
    .setFooter({ text: 'GoldenHeart SMP • Role Menu' });

  // 2. The Color Dropdown
  const colorMenu = new StringSelectMenuBuilder()
    .setCustomId('rr_colors')
    .setPlaceholder('🎨 Select your favourite colors...')
    .setMinValues(0)
    .setMaxValues(3) // Let them pick up to 3 colors
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Crimson Red').setValue(ROLES.red).setEmoji('🔴').setDescription('Passionate and bold'),
      new StringSelectMenuOptionBuilder().setLabel('Ocean Blue').setValue(ROLES.blue).setEmoji('🌊').setDescription('Calm and collected'),
      new StringSelectMenuOptionBuilder().setLabel('Forest Green').setValue(ROLES.green).setEmoji('🌲').setDescription('Nature lover'),
      new StringSelectMenuOptionBuilder().setLabel('Royal Purple').setValue(ROLES.purple).setEmoji('🔮').setDescription('Mysterious and elegant'),
      new StringSelectMenuOptionBuilder().setLabel('Neon Pink').setValue(ROLES.pink).setEmoji('🌸').setDescription('Bright and vibrant')
    );
  const row1 = new ActionRowBuilder().addComponents(colorMenu);

  // 3. The Age Buttons
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.under18}`).setLabel('Under 18').setEmoji('🌱').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.over18}`).setLabel('18 or Older').setEmoji('🌳').setStyle(ButtonStyle.Primary)
  );

  // 4. The Platform Buttons
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pc}`).setLabel('PC Player').setEmoji('💻').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.mobile}`).setLabel('Mobile Player').setEmoji('📱').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ content: '✅ Role menu deployed successfully!', ephemeral: true });
  await interaction.channel.send({ embeds: [embed], components: [row1, row2, row3] });
}

// ─────────────────────────────────────────
// INTERACTION HANDLERS
// ─────────────────────────────────────────
async function handleRRInteraction(interaction) {
  // HANDLE COLOR DROPDOWN (Select Menu)
  if (interaction.isStringSelectMenu() && interaction.customId === 'rr_colors') {
    await interaction.deferReply({ ephemeral: true });
    const selectedRoles = interaction.values;
    const member = interaction.member;

    // The IDs of all color roles in this dropdown
    const allColorRoleIds = [ROLES.red, ROLES.blue, ROLES.green, ROLES.purple, ROLES.pink];

    try {
      // First, remove any color roles they currently have that they DIDN'T select
      const rolesToRemove = allColorRoleIds.filter(id => member.roles.cache.has(id) && !selectedRoles.includes(id));
      if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);

      // Then, add the ones they DID select
      const rolesToAdd = selectedRoles.filter(id => !member.roles.cache.has(id));
      if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd);

      return interaction.editReply({ content: '✅ Your color roles have been updated!' });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ Failed to update roles. Make sure my bot role is higher than the roles I am trying to assign!' });
    }
  }

  // HANDLE AGE & PLATFORM (Buttons)
  if (interaction.isButton() && interaction.customId.startsWith('rr_btn_')) {
    await interaction.deferReply({ ephemeral: true });
    
    // Extract the role ID from the customId string (rr_btn_123456789)
    const roleId = interaction.customId.replace('rr_btn_', '');
    const member = interaction.member;

    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({ content: `🗑️ Role removed successfully!` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✨ Role added successfully!` });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ Failed to update role. Make sure my bot role is higher than the roles I am trying to assign!' });
    }
  }
}

module.exports = {
  rrCommandsData,
  handleRRSetup,
  handleRRInteraction
};

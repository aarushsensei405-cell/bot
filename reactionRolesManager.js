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

const rrCommandsData = [
  new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('Spawns the fancy button-based reaction roles menu.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

async function handleRRSetup(interaction) {
  // 1. Core Embed Menu
  const embed = new EmbedBuilder()
    .setTitle('✨ Personalize Your Profile ✨')
    .setDescription([
      'Welcome to the role assignment desk! Customize how you appear in the server by selecting your attributes below.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🎨 **What is your signature color?**',
      'Choose a clean name color from our palette line-up.',
      '',
      '🎂 **Which age demographic do you belong to?**',
      'Let us know your general age bracket.',
      '',
      '🎮 **What device do you use to explore the SMP?**',
      'Select your primary operational platform.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '*All choices are completely toggleable. Click a button again to remove its associated role.*'
    ].join('\n'))
    .setColor(0x2b2d31)
    .setImage('https://i.imgur.com/8Q853f2.gif')
    .setFooter({ text: 'GoldenHeart SMP • Role Menu' });

  // 2. Color Layout via Buttons (No drop-downs)
  const colorRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.red}`).setLabel('Crimson Red').setEmoji('🔴').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.blue}`).setLabel('Ocean Blue').setEmoji('🌊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.green}`).setLabel('Forest Green').setEmoji('🌲').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.purple}`).setLabel('Royal Purple').setEmoji('🔮').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pink}`).setLabel('Neon Pink').setEmoji('🌸').setStyle(ButtonStyle.Secondary)
  );

  // 3. Age Question Buttons
  const ageRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.under18}`).setLabel('Under 18').setEmoji('🌱').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.over18}`).setLabel('18 or Older').setEmoji('🌳').setStyle(ButtonStyle.Primary)
  );

  // 4. Platform Question Buttons
  const platformRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.pc}`).setLabel('PC Player').setEmoji('💻').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rr_btn_${ROLES.mobile}`).setLabel('Mobile Player').setEmoji('📱').setStyle(ButtonStyle.Success)
  );

  await interaction.reply({ content: '✅ Role menu deployed successfully!', ephemeral: true });
  await interaction.channel.send({ embeds: [embed], components: [colorRow, ageRow, platformRow] });
}

// ─────────────────────────────────────────
// INTERACTION HANDLERS
// ─────────────────────────────────────────
async function handleRRInteraction(interaction) {
  // Process only button interactions handling our exact custom ID format
  if (interaction.isButton() && interaction.customId.startsWith('rr_btn_')) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleId = interaction.customId.replace('rr_btn_', '');
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.editReply({ content: '❌ Role configuration error: This role no longer exists on this server.' });
    }

    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({ content: `🗑️ **${role.name}** was removed from your profile.` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✨ **${role.name}** has been added to your profile!` });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: '❌ Failed to update role. Please verify that the bot\'s role is physically ordered higher than the target roles in Server Settings!' });
    }
  }
}

module.exports = {
  rrCommandsData,
  handleRRSetup,
  handleRRInteraction
};

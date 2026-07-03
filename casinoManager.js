// casinoManager.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');

// Retrieve your existing User model
const User = mongoose.models.User || mongoose.model('User');

// --- MINES GAME STATE DATA STRUCTURE ---
// Keeps track of active mines games in memory
const activeMinesGames = new Map();

const casinoCommandsData = [
  // Coinflip Command
  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Bet your coins on a 50/50 coin flip!')
    .addIntegerOption(opt => 
      opt.setName('bet')
         .setDescription('Amount of coins to bet')
         .setRequired(true)
         .setMinValue(1)
    )
    .addStringOption(opt => 
      opt.setName('side')
         .setDescription('Choose heads or tails')
         .setRequired(true)
         .addChoices(
           { name: 'Heads', value: 'heads' },
           { name: 'Tails', value: 'tails' }
         )
    ),

  // Mines Command
  new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Bet coins in a grid-field of hidden mines!')
    .addIntegerOption(opt => 
      opt.setName('bet')
         .setDescription('Amount of coins to bet')
         .setRequired(true)
         .setMinValue(1)
    )
    .addIntegerOption(opt => 
      opt.setName('bombs')
         .setDescription('Number of hidden bombs (1-24)')
         .setRequired(true)
         .setMinValue(1)
         .setMaxValue(24)
    )
];

/**
 * Main Interaction Handler Entry Point
 */
async function handleCasinoInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    if (commandName === 'coinflip') return handleCoinflip(interaction);
    if (commandName === 'mines') return handleMinesStart(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('mines_')) {
      return handleMinesClick(interaction);
    }
  }
}

// ─────────────────────────────────────────
// COINFLIP LOGIC
// ─────────────────────────────────────────
async function handleCoinflip(interaction) {
  const bet = interaction.options.getInteger('bet');
  const choice = interaction.options.getString('side');
  const userId = interaction.user.id;

  let userData = await User.findOne({ userId });
  if (!userData || userData.coins < bet) {
    return interaction.reply({ 
      content: `❌ You do not have enough coins! Your balance: **${userData ? userData.coins.toFixed(1) : 0}** coins.`, 
      ephemeral: true 
    });
  }

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = choice === result;

  if (won) {
    userData.coins += bet;
    await userData.save();
    
    const embed = new EmbedBuilder()
      .setTitle('🪙 Coinflip: WINNER!')
      .setColor(0x57f287)
      .setDescription(`The coin landed on **${result.toUpperCase()}**!\n\nYou won **${bet}** coins!\nYour new balance: **${userData.coins.toFixed(1)}** coins.`);
    return interaction.reply({ embeds: [embed] });
  } else {
    userData.coins -= bet;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('🪙 Coinflip: LOST')
      .setColor(0xed4245)
      .setDescription(`The coin landed on **${result.toUpperCase()}**.\n\nYou lost **${bet}** coins.\nYour new balance: **${userData.coins.toFixed(1)}** coins.`);
    return interaction.reply({ embeds: [embed] });
  }
}

// ─────────────────────────────────────────
// MINES LOGIC
// ─────────────────────────────────────────
async function handleMinesStart(interaction) {
  const bet = interaction.options.getInteger('bet');
  const bombCount = interaction.options.getInteger('bombs');
  const userId = interaction.user.id;

  let userData = await User.findOne({ userId });
  if (!userData || userData.coins < bet) {
    return interaction.reply({ 
      content: `❌ You don't have enough coins to place this bet.`, 
      ephemeral: true 
    });
  }

  // Deduct bet immediately up-front
  userData.coins -= bet;
  await userData.save();

  // Generate 5x5 board data array (0 to 24 index positions)
  const board = Array(25).fill('diamond');
  let placedBombs = 0;
  while (placedBombs < bombCount) {
    const randIdx = Math.floor(Math.random() * 25);
    if (board[randIdx] !== 'bomb') {
      board[randIdx] = 'bomb';
      placedBombs++;
    }
  }

  // Register state data
  const gameId = `${userId}_${Date.now()}`;
  activeMinesGames.set(gameId, {
    userId,
    bet,
    bombCount,
    board,
    revealed: Array(25).fill(false),
    diamondsFound: 0,
    gameOver: false
  });

  return renderMinesBoard(interaction, gameId, false);
}

/**
 * Renders the Mines Board message components
 */
async function renderMinesBoard(interaction, gameId, isUpdate = true) {
  const gameState = activeMinesGames.get(gameId);
  if (!gameState) return;

  // Calculate standard House Multiply multiplier scale
  // Multiplier formula approach: combinatorial odds with a modest house edge markup
  const safeCount = 25 - gameState.bombCount;
  let multiplier = 0.96; // Base multiplier containing house margin protection
  for (let i = 0; i < gameState.diamondsFound; i++) {
    multiplier *= (25 - i) / (safeCount - i);
  }
  
  const currentCashoutValue = Math.floor(gameState.bet * multiplier);

  const embed = new EmbedBuilder()
    .setTitle('💣 Mines Field Sandbox')
    .setColor(gameState.gameOver ? 0xed4245 : 0xf0b429)
    .setDescription([
      `**Player:** <@${gameState.userId}>`,
      `**Initial Bet:** ${gameState.bet} coins`,
      `**Bombs on Board:** ${gameState.bombCount} | **Safe Tiles:** ${safeCount}`,
      `**Tiles Cleared:** ${gameState.diamondsFound}`,
      `💰 **Current Cashout Value:** **${currentCashoutValue}** coins (\`${multiplier.toFixed(2)}x\`)`,
      gameState.gameOver ? '\n🛑 **GAME OVER**' : '\nClick below tiles to uncover diamonds! Cash out safely before hitting a bomb.'
    ].join('\n'));

  // Build the 5x5 grid component layout structure
  const rows = [];
  for (let row = 0; row < 5; row++) {
    const actionRow = new ActionRowBuilder();
    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      const isRevealed = gameState.revealed[index];
      
      let button = new ButtonBuilder()
        .setCustomId(`mines_click:${gameId}:${index}`)
        .setStyle(ButtonStyle.Secondary)
        .setLabel('❓');

      if (isRevealed || gameState.gameOver) {
        const item = gameState.board[index];
        if (item === 'bomb') {
          button.setLabel('💣').setStyle(ButtonStyle.Danger);
        } else {
          button.setLabel('💎').setStyle(ButtonStyle.Success);
        }
        if (isRevealed && item === 'diamond') {
          button.setStyle(ButtonStyle.Primary);
        }
      }

      // Disable buttons if revealed or game is completely finalized
      if (isRevealed || gameState.gameOver) {
        button.setDisabled(true);
      }

      actionRow.addComponents(button);
    }
    rows.push(actionRow);
  }

  // Add functional Cashout row if game actively in play
  if (!gameState.gameOver && gameState.diamondsFound > 0) {
    const cashoutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mines_cashout:${gameId}`)
        .setStyle(ButtonStyle.Success)
        .setLabel(`💵 Cash Out (${currentCashoutValue} coins)`)
    );
    rows.push(cashoutRow);
  }

  if (isUpdate) {
    await interaction.update({ embeds: [embed], components: rows });
  } else {
    await interaction.reply({ embeds: [embed], components: rows });
  }
}

async function handleMinesClick(interaction) {
  const [action, gameId, indexStr] = interaction.customId.split(':');
  const gameState = activeMinesGames.get(gameId);

  if (!gameState) {
    return interaction.reply({ content: '❌ Game session expired or data missing.', ephemeral: true });
  }
  if (interaction.user.id !== gameState.userId) {
    return interaction.reply({ content: '❌ This is not your game box context!', ephemeral: true });
  }

  // Cash out execution path
  if (action === 'mines_cashout') {
    const safeCount = 25 - gameState.bombCount;
    let multiplier = 0.96;
    for (let i = 0; i < gameState.diamondsFound; i++) {
      multiplier *= (25 - i) / (safeCount - i);
    }
    const winnings = Math.floor(gameState.bet * multiplier);

    let userData = await User.findOne({ userId: gameState.userId });
    userData.coins += winnings;
    await userData.save();

    gameState.gameOver = true;
    await renderMinesBoard(interaction, gameId, true);
    activeMinesGames.delete(gameId);
    return;
  }

  // Tile clicking grid progression
  const index = parseInt(indexStr);
  gameState.revealed[index] = true;

  if (gameState.board[index] === 'bomb') {
    // Boom! Hit a bomb
    gameState.gameOver = true;
    await renderMinesBoard(interaction, gameId, true);
    activeMinesGames.delete(gameId);
  } else {
    // Uncovered a diamond safely
    gameState.diamondsFound++;
    const maxSafeTiles = 25 - gameState.bombCount;
    
    if (gameState.diamondsFound === maxSafeTiles) {
      // Hit max possible diamonds! Forced cash out automatically
      let multiplier = 0.96;
      for (let i = 0; i < gameState.diamondsFound; i++) {
        multiplier *= (25 - i) / (maxSafeTiles - i);
      }
      const winnings = Math.floor(gameState.bet * multiplier);
      
      let userData = await User.findOne({ userId: gameState.userId });
      userData.coins += winnings;
      await userData.save();

      gameState.gameOver = true;
      await renderMinesBoard(interaction, gameId, true);
      activeMinesGames.delete(gameId);
    } else {
      // Game continues safely
      await renderMinesBoard(interaction, gameId, true);
    }
  }
}

module.exports = {
  casinoCommandsData,
  handleCasinoInteraction
};

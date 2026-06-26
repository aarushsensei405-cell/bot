// ─────────────────────────────────────────
// TRACKING INTEGRATION
// Connects voice and invite trackers to your bot
// ─────────────────────────────────────────

const { VoiceTracker, setupVoiceTracking } = require('./voiceTracker');
const { InviteTracker, setupInviteTracking } = require('./inviteTracker');

function setupTracking(client, guildId) {
  console.log('📊 Setting up tracking systems...');

  // ── VOICE TRACKING ──
  const voiceTracker = new VoiceTracker(client);
  setupVoiceTracking(client, voiceTracker);
  
  // Start cleanup interval (runs every 5 minutes)
  voiceTracker.startCleanup(300000);

  // ── INVITE TRACKING ──
  const inviteTracker = new InviteTracker(client);
  setupInviteTracking(client, inviteTracker);

  // Initialize invite tracker after bot is ready
  setTimeout(async () => {
    await inviteTracker.initialize(guildId);
    inviteTracker.startRefresh(guildId, 300000); // Refresh every 5 minutes
  }, 5000);

  console.log('✅ Tracking systems setup complete!');

  return { voiceTracker, inviteTracker };
}

// ── COMMANDS FOR TRACKING ──
function getTrackingCommands() {
  return [
    {
      name: 'voicestats',
      description: 'View your voice chat stats',
      execute: async (interaction, voiceTracker) => {
        const stats = await voiceTracker.getUserStats(interaction.user.id);
        if (!stats) {
          return interaction.reply({ 
            content: '📊 You have no voice chat history yet! Join a voice channel to start tracking.', 
            ephemeral: true 
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🎤 ${interaction.user.username}'s Voice Stats`)
          .setColor(0x5865f2)
          .addFields(
            { name: '⏱️ Total Time', value: `${stats.totalMinutes} minutes`, inline: true },
            { name: '🪙 Coins Earned', value: `${stats.totalCoinsEarned} coins`, inline: true },
            { name: '📅 Sessions', value: `${stats.sessions.length}`, inline: true },
          );

        if (stats.currentSession) {
          embed.addFields({
            name: '🔴 Currently In VC',
            value: `**${stats.currentSession.channel}** (${stats.currentSession.duration} minutes so far)`,
            inline: false,
          });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    },
    {
      name: 'invitestats',
      description: 'View your invite stats',
      execute: async (interaction, inviteTracker) => {
        const stats = await inviteTracker.getInviterStats(interaction.user.id);
        if (!stats) {
          return interaction.reply({ 
            content: '📊 You haven\'t invited anyone yet! Share your invite link to earn coins.', 
            ephemeral: true 
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`📨 ${interaction.user.username}'s Invite Stats`)
          .setColor(0x57f287)
          .addFields(
            { name: '👥 Total Invites', value: `${stats.totalInvites}`, inline: true },
            { name: '🪙 Coins Earned', value: `${stats.totalCoinsEarned} coins`, inline: true },
          );

        if (stats.invites.length > 0) {
          const recent = stats.invites.slice(-5).map(inv => 
            `• **${inv.member}** (${inv.joinedAt.toLocaleDateString()}) — ${inv.coinsEarned} coins`
          ).join('\n');
          embed.addFields({
            name: '📋 Recent Invites',
            value: recent || 'No recent invites',
            inline: false,
          });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    },
    {
      name: 'voiceleaderboard',
      description: 'View the voice chat leaderboard',
      execute: async (interaction, voiceTracker) => {
        const leaderboard = await voiceTracker.getLeaderboard(10);
        if (leaderboard.length === 0) {
          return interaction.reply({ 
            content: '📊 No voice chat data yet!', 
            ephemeral: true 
          });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = leaderboard.map((user, i) => {
          const medal = medals[i] || `\`${i + 1}.\``;
          return `${medal} <@${user.userId}> — **${user.totalMinutes} min** (${user.totalCoinsEarned} coins)`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle('🎤 Voice Chat Leaderboard — Top 10')
          .setColor(0x5865f2)
          .setDescription(lines)
          .setFooter({ text: 'Earn 1 coin per minute in voice chat!' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    },
    {
      name: 'inviteleaderboard',
      description: 'View the invite leaderboard',
      execute: async (interaction, inviteTracker) => {
        const leaderboard = await inviteTracker.getLeaderboard(10);
        if (leaderboard.length === 0) {
          return interaction.reply({ 
            content: '📊 No invite data yet!', 
            ephemeral: true 
          });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = leaderboard.map((user, i) => {
          const medal = medals[i] || `\`${i + 1}.\``;
          return `${medal} <@${user.userId}> — **${user.totalInvites} invites** (${user.totalCoinsEarned} coins)`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle('📨 Invite Leaderboard — Top 10')
          .setColor(0x57f287)
          .setDescription(lines)
          .setFooter({ text: 'Earn 50 coins per invite!' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    },
  ];
}

module.exports = {
  setupTracking,
  getTrackingCommands,
};

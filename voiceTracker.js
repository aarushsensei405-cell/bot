// ─────────────────────────────────────────
// VOICE CHAT TRACKER
// Tracks user voice activity and awards coins
// ─────────────────────────────────────────

const mongoose = require('mongoose');

// ── VOICE TRACKING SCHEMA ──
const VoiceSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  currentSession: {
    startTime: Date,
    channelId: String,
    channelName: String,
  },
  totalMinutes: { type: Number, default: 0 },
  totalCoinsEarned: { type: Number, default: 0 },
  sessions: [{
    startTime: Date,
    endTime: Date,
    channelId: String,
    channelName: String,
    durationMinutes: Number,
    coinsEarned: Number,
  }],
  lastUpdated: { type: Date, default: Date.now },
});

const VoiceSession = mongoose.model('VoiceSession', VoiceSessionSchema);

// ── VOICE TRACKER CLASS ──
class VoiceTracker {
  constructor(client) {
    this.client = client;
    this.activeSessions = new Map(); // userId -> { startTime, channelId, channelName }
    this.COINS_PER_MINUTE = 1;
    this.MINIMUM_MINUTES = 1;
  }

  // ── START TRACKING ──
  async startTracking(member, channel) {
    const userId = member.user.id;
    const username = member.user.tag;

    // Don't track bots
    if (member.user.bot) return;

    // Check if already in a session
    if (this.activeSessions.has(userId)) {
      console.log(`⚠️ ${username} already in a voice session`);
      return;
    }

    // Start tracking
    this.activeSessions.set(userId, {
      startTime: Date.now(),
      channelId: channel.id,
      channelName: channel.name,
      username: username,
    });

    console.log(`🎤 Started tracking ${username} in ${channel.name}`);

    // Update or create user session in DB
    try {
      let session = await VoiceSession.findOne({ userId });
      if (!session) {
        session = new VoiceSession({ userId, username });
      }
      session.username = username;
      session.currentSession = {
        startTime: new Date(),
        channelId: channel.id,
        channelName: channel.name,
      };
      session.lastUpdated = new Date();
      await session.save();
    } catch (err) {
      console.error('❌ Error saving voice session start:', err);
    }
  }

  // ── STOP TRACKING ──
  async stopTracking(member) {
    const userId = member.user.id;
    const username = member.user.tag;

    // Don't track bots
    if (member.user.bot) return;

    // Check if user is being tracked
    if (!this.activeSessions.has(userId)) {
      console.log(`⚠️ ${username} not in an active voice session`);
      return;
    }

    // Get session data
    const sessionData = this.activeSessions.get(userId);
    const startTime = sessionData.startTime;
    const channelId = sessionData.channelId;
    const channelName = sessionData.channelName;

    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.floor(durationMs / 60000);

    // Calculate coins earned
    let coinsEarned = 0;
    if (durationMinutes >= this.MINIMUM_MINUTES) {
      coinsEarned = durationMinutes * this.COINS_PER_MINUTE;
    }

    console.log(`🎤 ${username} left ${channelName} after ${durationMinutes} minutes (${coinsEarned} coins)`);

    // Remove from active sessions
    this.activeSessions.delete(userId);

    // Only process if they were in VC long enough
    if (durationMinutes < this.MINIMUM_MINUTES) {
      console.log(`⏱️ ${username} was in VC for less than ${this.MINIMUM_MINUTES} minute, no coins awarded`);
      return;
    }

    try {
      // Get or create user in User model (main coins)
      const User = mongoose.model('User');
      let user = await User.findOne({ userId });
      if (!user) {
        user = new User({ userId, username });
      }
      user.username = username;
      user.coins += coinsEarned;
      user.voiceMinutes += durationMinutes;
      await user.save();

      // Update voice session tracking
      let voiceSession = await VoiceSession.findOne({ userId });
      if (!voiceSession) {
        voiceSession = new VoiceSession({ userId, username });
      }
      voiceSession.username = username;
      voiceSession.totalMinutes += durationMinutes;
      voiceSession.totalCoinsEarned += coinsEarned;
      voiceSession.currentSession = null;
      voiceSession.sessions.push({
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        channelId: channelId,
        channelName: channelName,
        durationMinutes: durationMinutes,
        coinsEarned: coinsEarned,
      });
      voiceSession.lastUpdated = new Date();
      await voiceSession.save();

      console.log(`✅ ${username} earned ${coinsEarned} coins for ${durationMinutes} minutes in VC`);

      // Return earning info for notifications
      return {
        userId,
        username,
        durationMinutes,
        coinsEarned,
        channelName,
      };
    } catch (err) {
      console.error('❌ Error saving voice session end:', err);
    }
  }

  // ── MOVE CHANNEL ──
  async moveChannel(member, oldChannel, newChannel) {
    const userId = member.user.id;
    const username = member.user.tag;

    // Don't track bots
    if (member.user.bot) return;

    // If tracking, update channel info
    if (this.activeSessions.has(userId)) {
      const sessionData = this.activeSessions.get(userId);
      sessionData.channelId = newChannel.id;
      sessionData.channelName = newChannel.name;
      this.activeSessions.set(userId, sessionData);

      // Update DB
      try {
        const voiceSession = await VoiceSession.findOne({ userId });
        if (voiceSession && voiceSession.currentSession) {
          voiceSession.currentSession.channelId = newChannel.id;
          voiceSession.currentSession.channelName = newChannel.name;
          await voiceSession.save();
        }
      } catch (err) {
        console.error('❌ Error updating voice session move:', err);
      }

      console.log(`🔄 ${username} moved from ${oldChannel.name} to ${newChannel.name}`);
    }
  }

  // ── GET USER VOICE STATS ──
  async getUserStats(userId) {
    try {
      const voiceSession = await VoiceSession.findOne({ userId });
      if (!voiceSession) return null;

      return {
        totalMinutes: voiceSession.totalMinutes,
        totalCoinsEarned: voiceSession.totalCoinsEarned,
        sessions: voiceSession.sessions.map(s => ({
          date: s.startTime,
          channel: s.channelName,
          duration: s.durationMinutes,
          coins: s.coinsEarned,
        })),
        currentSession: voiceSession.currentSession ? {
          startTime: voiceSession.currentSession.startTime,
          channel: voiceSession.currentSession.channelName,
          duration: Math.floor((Date.now() - voiceSession.currentSession.startTime.getTime()) / 60000),
        } : null,
      };
    } catch (err) {
      console.error('❌ Error getting voice stats:', err);
      return null;
    }
  }

  // ── GET LEADERBOARD ──
  async getLeaderboard(limit = 10) {
    try {
      return await VoiceSession.find({ totalMinutes: { $gt: 0 } })
        .sort({ totalMinutes: -1 })
        .limit(limit)
        .select('userId username totalMinutes totalCoinsEarned')
        .lean();
    } catch (err) {
      console.error('❌ Error getting voice leaderboard:', err);
      return [];
    }
  }

  // ── CLEANUP (Remove inactive sessions) ──
  cleanup() {
    const now = Date.now();
    const MAX_IDLE_TIME = 300000; // 5 minutes

    for (const [userId, session] of this.activeSessions) {
      if (now - session.startTime > MAX_IDLE_TIME) {
        console.log(`🧹 Cleaning up stale session for ${session.username}`);
        this.activeSessions.delete(userId);
      }
    }
  }

  // ── START CLEANUP INTERVAL ──
  startCleanup(intervalMs = 60000) {
    setInterval(() => this.cleanup(), intervalMs);
    console.log(`🧹 Voice tracker cleanup started (interval: ${intervalMs}ms)`);
  }
}

// ─────────────────────────────────────────
// VOICE EVENT HANDLER
// ─────────────────────────────────────────
function setupVoiceTracking(client, voiceTracker) {
  // Voice state update handler
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // Joined a voice channel
    if (!oldChannel && newChannel) {
      await voiceTracker.startTracking(member, newChannel);
    }
    // Left a voice channel
    else if (oldChannel && !newChannel) {
      const result = await voiceTracker.stopTracking(member);
      if (result && result.coinsEarned > 0) {
        // Send notification
        try {
          const user = await client.users.fetch(result.userId);
          await user.send(`🎤 **Voice Chat Rewards!**\n\nYou earned **${result.coinsEarned} coins** for being in **${result.channelName}** for **${result.durationMinutes} minutes**!\n\n💳 Total: ${result.coinsEarned} coins added! 🪙`);
        } catch (err) {
          console.log(`Could not DM user ${member.user.tag}`);
        }
      }
    }
    // Moved between voice channels
    else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
      await voiceTracker.moveChannel(member, oldChannel, newChannel);
    }
  });

  console.log('✅ Voice tracking events setup complete');
}

module.exports = {
  VoiceTracker,
  VoiceSession,
  setupVoiceTracking,
};

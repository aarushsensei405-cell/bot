// ─────────────────────────────────────────
// INVITE TRACKER
// Tracks invites and awards coins to inviters
// ─────────────────────────────────────────

const mongoose = require('mongoose');

// ── INVITE TRACKING SCHEMA ──
const InviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  inviterId: String,
  inviterUsername: String,
  uses: { type: Number, default: 0 },
  maxUses: Number,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

const InviteUseSchema = new mongoose.Schema({
  inviteCode: String,
  inviterId: String,
  newMemberId: String,
  newMemberUsername: String,
  usedAt: { type: Date, default: Date.now },
  coinsAwarded: { type: Number, default: 0 },
});

const InviteStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  totalInvites: { type: Number, default: 0 },
  totalCoinsEarned: { type: Number, default: 0 },
  invites: [{
    code: String,
    newMemberId: String,
    newMemberUsername: String,
    usedAt: { type: Date, default: Date.now },
    coinsEarned: { type: Number, default: 0 },
  }],
  lastUpdated: { type: Date, default: Date.now },
});

const Invite = mongoose.model('Invite', InviteSchema);
const InviteUse = mongoose.model('InviteUse', InviteUseSchema);
const InviteStats = mongoose.model('InviteStats', InviteStatsSchema);

// ── INVITE TRACKER CLASS ──
class InviteTracker {
  constructor(client) {
    this.client = client;
    this.COINS_PER_INVITE = 50;
    this.cachedInvites = new Map();
    this.isInitialized = false;
  }

  // ── INITIALIZE ──
  async initialize(guildId) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.error('❌ Guild not found for invite tracking');
        return;
      }

      // Fetch all invites
      const invites = await guild.invites.fetch();
      
      // Cache invites
      for (const [code, invite] of invites) {
        this.cachedInvites.set(code, {
          code,
          uses: invite.uses || 0,
          inviterId: invite.inviter?.id,
          inviterUsername: invite.inviter?.tag,
          maxUses: invite.maxUses,
          createdAt: invite.createdAt,
        });

        // Save to database
        await Invite.findOneAndUpdate(
          { code },
          {
            code,
            inviterId: invite.inviter?.id,
            inviterUsername: invite.inviter?.tag,
            uses: invite.uses || 0,
            maxUses: invite.maxUses,
            createdAt: invite.createdAt,
          },
          { upsert: true }
        );
      }

      this.isInitialized = true;
      console.log(`✅ Invite tracker initialized with ${this.cachedInvites.size} invites`);
    } catch (err) {
      console.error('❌ Error initializing invite tracker:', err);
    }
  }

  // ── TRACK NEW INVITE CREATION ──
  async trackInviteCreate(invite) {
    try {
      this.cachedInvites.set(invite.code, {
        code: invite.code,
        uses: invite.uses || 0,
        inviterId: invite.inviter.id,
        inviterUsername: invite.inviter.tag,
        maxUses: invite.maxUses,
        createdAt: invite.createdAt,
      });

      await Invite.findOneAndUpdate(
        { code: invite.code },
        {
          code: invite.code,
          inviterId: invite.inviter.id,
          inviterUsername: invite.inviter.tag,
          uses: invite.uses || 0,
          maxUses: invite.maxUses,
          createdAt: invite.createdAt,
        },
        { upsert: true }
      );

      console.log(`📨 New invite created: ${invite.code} by ${invite.inviter.tag}`);
    } catch (err) {
      console.error('❌ Error tracking invite creation:', err);
    }
  }

  // ── TRACK INVITE DELETE ──
  async trackInviteDelete(invite) {
    try {
      this.cachedInvites.delete(invite.code);
      await Invite.deleteOne({ code: invite.code });
      console.log(`📨 Invite deleted: ${invite.code}`);
    } catch (err) {
      console.error('❌ Error tracking invite deletion:', err);
    }
  }

  // ── PROCESS NEW MEMBER JOIN ──
  async processNewMember(member) {
    try {
      if (!this.isInitialized) {
        console.log('⏳ Invite tracker not initialized, initializing...');
        await this.initialize(member.guild.id);
      }

      const guild = member.guild;
      const newMemberId = member.user.id;
      const newMemberUsername = member.user.tag;

      // Fetch current invites
      const currentInvites = await guild.invites.fetch();
      
      // Find which invite was used
      for (const [code, invite] of currentInvites) {
        const cached = this.cachedInvites.get(code);
        
        // Check if invite uses increased
        if (cached && invite.uses > cached.uses) {
          const inviterId = invite.inviter?.id;
          const inviterUsername = invite.inviter?.tag;
          
          if (inviterId && inviterId !== newMemberId) {
            // Found the used invite
            await this.awardCoins(
              inviterId,
              inviterUsername,
              code,
              newMemberId,
              newMemberUsername
            );

            // Update cache
            this.cachedInvites.set(code, {
              ...cached,
              uses: invite.uses,
            });

            // Update database
            await Invite.findOneAndUpdate(
              { code },
              { uses: invite.uses }
            );

            console.log(`📨 ${newMemberUsername} joined using invite ${code} from ${inviterUsername}`);
            return true;
          }
        }
      }

      // No matching invite found - might be an old invite or direct join
      console.log(`📨 ${newMemberUsername} joined without a tracked invite`);
      return false;
    } catch (err) {
      console.error('❌ Error processing new member:', err);
      return false;
    }
  }

  // ── AWARD COINS TO INVITER ──
  async awardCoins(inviterId, inviterUsername, inviteCode, newMemberId, newMemberUsername) {
    try {
      const coinsToAward = this.COINS_PER_INVITE;

      // Get or create User
      const User = mongoose.model('User');
      let user = await User.findOne({ userId: inviterId });
      if (!user) {
        user = new User({ userId: inviterId, username: inviterUsername });
      }
      user.username = inviterUsername;
      user.coins += coinsToAward;
      user.invites += 1;
      await user.save();

      // Update invite stats
      let stats = await InviteStats.findOne({ userId: inviterId });
      if (!stats) {
        stats = new InviteStats({ userId: inviterId, username: inviterUsername });
      }
      stats.username = inviterUsername;
      stats.totalInvites += 1;
      stats.totalCoinsEarned += coinsToAward;
      stats.invites.push({
        code: inviteCode,
        newMemberId: newMemberId,
        newMemberUsername: newMemberUsername,
        coinsEarned: coinsToAward,
      });
      stats.lastUpdated = new Date();
      await stats.save();

      // Record the use
      await new InviteUse({
        inviteCode,
        inviterId,
        newMemberId,
        newMemberUsername,
        coinsAwarded: coinsToAward,
      }).save();

      console.log(`💰 ${inviterUsername} earned ${coinsToAward} coins for inviting ${newMemberUsername}`);

      // DM the inviter
      try {
        const inviter = await this.client.users.fetch(inviterId);
        await inviter.send(`🎉 **Invite Reward!**\n\n**${newMemberUsername}** joined using your invite link!\n\n💰 You earned **${coinsToAward} coins**! 🪙\n\n📊 Total invites: **${user.invites}**\n💳 Total coins: **${user.coins}**`);
      } catch (err) {
        console.log(`Could not DM inviter ${inviterId}`);
      }

      return {
        inviterId,
        coinsAwarded: coinsToAward,
        newMemberUsername,
      };
    } catch (err) {
      console.error('❌ Error awarding coins:', err);
    }
  }

  // ── GET INVITER STATS ──
  async getInviterStats(userId) {
    try {
      const stats = await InviteStats.findOne({ userId });
      if (!stats) return null;

      return {
        totalInvites: stats.totalInvites,
        totalCoinsEarned: stats.totalCoinsEarned,
        invites: stats.invites.map(inv => ({
          member: inv.newMemberUsername,
          joinedAt: inv.usedAt,
          coinsEarned: inv.coinsEarned,
        })),
      };
    } catch (err) {
      console.error('❌ Error getting inviter stats:', err);
      return null;
    }
  }

  // ── GET INVITE LEADERBOARD ──
  async getLeaderboard(limit = 10) {
    try {
      return await InviteStats.find({ totalInvites: { $gt: 0 } })
        .sort({ totalInvites: -1 })
        .limit(limit)
        .select('userId username totalInvites totalCoinsEarned')
        .lean();
    } catch (err) {
      console.error('❌ Error getting invite leaderboard:', err);
      return [];
    }
  }

  // ── GET ALL INVITES ──
  async getAllInvites() {
    try {
      return await Invite.find({}).sort({ createdAt: -1 }).lean();
    } catch (err) {
      console.error('❌ Error getting all invites:', err);
      return [];
    }
  }

  // ── REFRESH INVITES ──
  async refreshInvites(guildId) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.error('❌ Guild not found for invite refresh');
        return;
      }

      const invites = await guild.invites.fetch();
      for (const [code, invite] of invites) {
        await Invite.findOneAndUpdate(
          { code },
          {
            code,
            inviterId: invite.inviter?.id,
            inviterUsername: invite.inviter?.tag,
            uses: invite.uses || 0,
            maxUses: invite.maxUses,
            createdAt: invite.createdAt,
          },
          { upsert: true }
        );
        
        this.cachedInvites.set(code, {
          code,
          uses: invite.uses || 0,
          inviterId: invite.inviter?.id,
          inviterUsername: invite.inviter?.tag,
          maxUses: invite.maxUses,
          createdAt: invite.createdAt,
        });
      }

      console.log(`🔄 Invites refreshed: ${this.cachedInvites.size} invites`);
    } catch (err) {
      console.error('❌ Error refreshing invites:', err);
    }
  }

  // ── START REFRESH INTERVAL ──
  startRefresh(guildId, intervalMs = 300000) {
    setInterval(() => this.refreshInvites(guildId), intervalMs);
    console.log(`🔄 Invite refresh started (interval: ${intervalMs}ms)`);
  }
}

// ─────────────────────────────────────────
// INVITE EVENT HANDLERS
// ─────────────────────────────────────────
function setupInviteTracking(client, inviteTracker) {
  // Guild member add - check if they used an invite
  client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    await inviteTracker.processNewMember(member);
  });

  // Invite create - track new invites
  client.on('inviteCreate', async (invite) => {
    await inviteTracker.trackInviteCreate(invite);
  });

  // Invite delete - remove from tracking
  client.on('inviteDelete', async (invite) => {
    await inviteTracker.trackInviteDelete(invite);
  });

  console.log('✅ Invite tracking events setup complete');
}

module.exports = {
  InviteTracker,
  Invite,
  InviteUse,
  InviteStats,
  setupInviteTracking,
};

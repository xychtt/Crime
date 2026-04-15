const { allowUser, getPendingReview, resolvePendingReview } = require('../utils/securityReviewStore');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('sec_allow:') && !interaction.customId.startsWith('sec_decline:')) return;

    if (!interaction.member.permissions.has('KickMembers')) {
      await interaction.reply({ content: 'You need Kick Members permission to use this.', ephemeral: true }).catch(() => {});
      return;
    }

    const [action, reviewId] = interaction.customId.split(':');
    const review = getPendingReview(reviewId);
    if (!review) {
      await interaction.reply({ content: 'This review no longer exists.', ephemeral: true }).catch(() => {});
      return;
    }
    if (review.resolved) {
      await interaction.reply({ content: 'This review was already handled.', ephemeral: true }).catch(() => {});
      return;
    }
    if (review.guildId !== interaction.guild.id) {
      await interaction.reply({ content: 'This review belongs to a different server.', ephemeral: true }).catch(() => {});
      return;
    }

    if (action === 'sec_allow') {
      allowUser(review.guildId, review.userId, interaction.user);
      resolvePendingReview(reviewId, {
        decision: 'allow',
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
      });

      await interaction.update({
        content: `Allowed by ${interaction.user.tag}: <@${review.userId}>`,
        components: [],
      }).catch(() => {});
      return;
    }

    const recommendedAction = review.recommendedAction === 'ban' ? 'ban' : 'kick';
    if (recommendedAction === 'ban' && !interaction.member.permissions.has('BanMembers')) {
      await interaction.reply({ content: 'This review requires Ban Members permission.', ephemeral: true }).catch(() => {});
      return;
    }
    try {
      if (recommendedAction === 'ban') {
        await interaction.guild.members.ban(review.userId, {
          reason: `Security review declined by ${interaction.user.tag}: ${review.reason}`,
        });
      } else {
        const target = await interaction.guild.members.fetch(review.userId).catch(() => null);
        if (target) {
          await target.kick(`Security review declined by ${interaction.user.tag}: ${review.reason}`);
        } else {
          await interaction.guild.members.ban(review.userId, {
            reason: `Security review declined (fallback ban): ${review.reason}`,
            deleteMessageSeconds: 0,
          });
        }
      }
    } catch {
      // We'll still resolve and notify mods; action might fail if role hierarchy blocks it.
    }

    resolvePendingReview(reviewId, {
      decision: 'decline',
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      actionTaken: recommendedAction,
    });

    await interaction.update({
      content: `Declined by ${interaction.user.tag}: <@${review.userId}> (${recommendedAction.toUpperCase()})`,
      components: [],
    }).catch(() => {});
  },
};

const { loadData, saveData } = require('./dataStore');

const FILE = 'securityReviews';

function getStore() {
  const raw = loadData(FILE);
  return {
    pending: raw.pending || {},
    allowlist: raw.allowlist || {},
  };
}

function saveStore(store) {
  saveData(FILE, store);
}

function isAllowlisted(guildId, userId) {
  const store = getStore();
  return Boolean(store.allowlist[guildId]?.[userId]);
}

function allowUser(guildId, userId, moderator) {
  const store = getStore();
  if (!store.allowlist[guildId]) store.allowlist[guildId] = {};
  store.allowlist[guildId][userId] = {
    approvedAt: new Date().toISOString(),
    moderatorId: moderator?.id || null,
    moderatorTag: moderator?.tag || null,
  };
  saveStore(store);
}

function createPendingReview(reviewId, payload) {
  const store = getStore();
  store.pending[reviewId] = {
    createdAt: new Date().toISOString(),
    resolved: false,
    ...payload,
  };
  saveStore(store);
}

function getPendingReview(reviewId) {
  const store = getStore();
  return store.pending[reviewId] || null;
}

function resolvePendingReview(reviewId, resolution) {
  const store = getStore();
  const existing = store.pending[reviewId];
  if (!existing) return null;
  store.pending[reviewId] = {
    ...existing,
    resolved: true,
    resolvedAt: new Date().toISOString(),
    ...resolution,
  };
  saveStore(store);
  return store.pending[reviewId];
}

module.exports = {
  isAllowlisted,
  allowUser,
  createPendingReview,
  getPendingReview,
  resolvePendingReview,
};


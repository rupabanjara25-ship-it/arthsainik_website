// utils/tokenBlacklist.js
// Simple in‑memory token revocation store. In production you would use Redis or DB.

const revokedTokens = new Set();

module.exports = {
  revokeToken: (token) => {
    revokedTokens.add(token);
  },
  isRevoked: (token) => revokedTokens.has(token),
  // For testing/debugging you may clear the set
  clear: () => revokedTokens.clear(),
};

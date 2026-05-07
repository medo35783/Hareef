/* ══════════════════════════════════════════════════
   TITLES GAME LOGIC
   - Game rules and calculations
   - Scoring system
   - Game state management
══════════════════════════════════════════════════ */

// Game phases
export const GAME_PHASES = {
  LOBBY: 'lobby',           // Waiting for players to join
  WAITING: 'waiting',       // Waiting for round to start
  ACTIVE: 'active',         // Round is running
  REVEALING: 'revealing',   // Showing results
  ENDED: 'ended'            // Game finished
};

// Player status
export const PLAYER_STATUS = {
  ACTIVE: 'active',
  REVEALED: 'revealed',     // Nick was revealed
  HUNTED: 'hunted',         // Player was hunted (eliminated)
  CHEATER: 'cheater'        // Violated rules
};

/**
 * Calculate attack accuracy for a player
 * @param {array} attacks - All attacks by this player
 * @returns {object} { total, correct, incorrect, accuracy }
 */
export const calculatePlayerStats = (attacks = []) => {
  const correct = attacks.filter(a => a.correct).length;
  const incorrect = attacks.filter(a => !a.correct).length;
  const total = attacks.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { total, correct, incorrect, accuracy };
};

/**
 * Rank players by accuracy
 * @param {array} playersList - List of players
 * @param {array} allAttacks - All attacks in game
 * @returns {array} Sorted by accuracy descending
 */
export const rankPlayersByAccuracy = (playersList = [], allAttacks = []) => {
  return playersList
    .map(p => {
      const nicks = [p.nick, p.nick2].filter(Boolean);
      const playerAttacks = allAttacks.filter(a =>
        nicks.includes(a.attackerNick)
      );
      const stats = calculatePlayerStats(playerAttacks);
      return { ...p, ...stats };
    })
    .sort((a, b) => {
      // Sort by accuracy descending, then by total attacks
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.total - a.total;
    });
};

/**
 * Check if all players have submitted their attacks
 * @param {object} players - Players object from Firebase
 * @param {object} attacks - Current round attacks
 * @param {number} expectedCount - Number of attacks per player
 * @returns {boolean}
 */
export const allPlayersSubmitted = (players = {}, attacks = {}, expectedCount = 1) => {
  const activePlayers = Object.values(players).filter(p => p.status === 'active');
  
  if (activePlayers.length === 0) return false;

  return activePlayers.every(p => {
    const nicks = [p.nick, p.nick2].filter(Boolean);
    const playerAttackCount = Object.values(attacks).filter(a =>
      nicks.includes(a.attackerNick)
    ).length;
    return playerAttackCount >= expectedCount;
  });
};

/**
 * Find who revealed a nick
 * @param {string} revealedNick - The nick that was revealed
 * @param {array} attacks - Attacks that revealed this nick
 * @returns {object} { attackerNick, attackerId, correctGuesses }
 */
export const findRevealer = (revealedNick, attacks = []) => {
  const correctAttacks = attacks.filter(a => 
    a.correct && a.targetNick === revealedNick
  );

  if (correctAttacks.length === 0) return null;

  const revealer = correctAttacks[0];
  return {
    attackerNick: revealer.attackerNick,
    correctGuesses: correctAttacks.length
  };
};

/**
 * Calculate round winner
 * @param {array} activePlayers - Players still in game
 * @returns {object} Winner player object
 */
export const calculateRoundWinner = (activePlayers = []) => {
  if (activePlayers.length === 0) return null;
  if (activePlayers.length === 1) return activePlayers[0];

  // Last player standing wins
  return activePlayers[0];
};

/**
 * Determine game winner (last player standing)
 * @param {array} playersList - All players
 * @returns {object} Winner or null
 */
export const determineGameWinner = (playersList = []) => {
  const activePlayers = playersList.filter(p => p.status === 'active');
  
  if (activePlayers.length === 1) {
    return activePlayers[0];
  }
  
  return null;
};

/**
 * Validate attack format
 * @param {object} attack - Attack object
 * @returns {object} { valid: boolean, error?: string }
 */
export const validateAttack = (attack) => {
  if (!attack) return { valid: false, error: 'Attack is required' };
  if (!attack.attackerNick) return { valid: false, error: 'Attacker nick is required' };
  if (!attack.targetNick) return { valid: false, error: 'Target nick is required' };
  if (attack.attackerNick === attack.targetNick) {
    return { valid: false, error: 'Cannot attack yourself' };
  }

  return { valid: true };
};

/**
 * Calculate game statistics
 * @param {array} playersList - All players
 * @param {array} allAttacks - All attacks
 * @returns {object} Game statistics
 */
export const calculateGameStats = (playersList = [], allAttacks = []) => {
  const activePlayers = playersList.filter(p => p.status === 'active').length;
  const revealedPlayers = playersList.filter(p => p.status === 'revealed').length;
  const huntedPlayers = playersList.filter(p => p.status === 'hunted').length;

  const totalAttacks = allAttacks.length;
  const correctAttacks = allAttacks.filter(a => a.correct).length;
  const accuracy = totalAttacks > 0 ? Math.round((correctAttacks / totalAttacks) * 100) : 0;

  return {
    totalPlayers: playersList.length,
    activePlayers,
    revealedPlayers,
    huntedPlayers,
    totalAttacks,
    correctAttacks,
    accuracy
  };
};

/**
 * Check if nick mode is valid
 * @param {number} nickMode - 1, 2, or 3
 * @returns {boolean}
 */
export const isValidNickMode = (nickMode) => {
  return [1, 2, 3].includes(nickMode);
};

/**
 * Get nick mode description
 * @param {number} nickMode - 1, 2, or 3
 * @returns {string}
 */
export const getNickModeDescription = (nickMode) => {
  const descriptions = {
    1: 'لقب واحد لكل لاعب',
    2: 'لقبان لكل لاعب',
    3: 'اختيار من 3 ألقاب'
  };
  return descriptions[nickMode] || 'غير معروف';
};

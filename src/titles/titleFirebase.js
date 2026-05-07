import { ref, set, update, push, get, onValue } from 'firebase/database';
import { db } from '../shared/firebase';

/* ══════════════════════════════════════════════════
   TITLES GAME FIREBASE OPERATIONS
   - All Firebase interactions for Titles game
══════════════════════════════════════════════════ */

// Database references
export const gameRef = (code) => ref(db, `rooms/${code}/game`);
export const playersRef = (code) => ref(db, `rooms/${code}/players`);
export const attacksRef = (code) => ref(db, `rooms/${code}/currentRound/attacks`);
export const roundsRef = (code) => ref(db, `rooms/${code}/rounds`);

/**
 * Create a new game room
 * @param {string} code - Room code
 * @param {object} config - Game configuration
 * @returns {Promise}
 */
export const createGameRoom = async (code, config = {}) => {
  const roomData = {
    code,
    phase: 'lobby',
    nickMode: config.nickMode || 1,
    createdAt: Date.now(),
    admin: config.admin,
    ...config
  };

  try {
    await set(gameRef(code), roomData);
    return { success: true, code };
  } catch (error) {
    console.error('Error creating room:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a player to the game
 * @param {string} code - Room code
 * @param {string} playerId - Player ID
 * @param {object} playerData - Player info (name, nick, nick2)
 * @returns {Promise}
 */
export const addPlayerToGame = async (code, playerId, playerData) => {
  try {
    await set(ref(db, `rooms/${code}/players/${playerId}`), {
      id: playerId,
      status: 'active',
      joinedAt: Date.now(),
      ...playerData
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding player:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Start a new round
 * @param {string} code - Room code
 * @param {number} roundNumber - Round number
 * @returns {Promise}
 */
export const startNewRound = async (code, roundNumber) => {
  try {
    const updates = {
      [`rooms/${code}/game/phase`]: 'active',
      [`rooms/${code}/game/currentRound`]: roundNumber,
      [`rooms/${code}/currentRound/attacks`]: {}
    };

    await update(ref(db), updates);
    return { success: true };
  } catch (error) {
    console.error('Error starting round:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit an attack (guess)
 * @param {string} code - Room code
 * @param {object} attack - Attack data
 * @returns {Promise}
 */
export const submitAttack = async (code, attack) => {
  try {
    const attacksRef = ref(db, `rooms/${code}/currentRound/attacks`);
    const newAttackRef = push(attacksRef);
    
    await set(newAttackRef, {
      ...attack,
      timestamp: Date.now()
    });

    return { success: true, attackId: newAttackRef.key };
  } catch (error) {
    console.error('Error submitting attack:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reveal a nick (mark as revealed in game)
 * @param {string} code - Room code
 * @param {string} playerId - Player who owns the nick
 * @param {string} nick - The nick being revealed
 * @returns {Promise}
 */
export const revealNick = async (code, playerId, nick) => {
  try {
    const updates = {
      [`rooms/${code}/players/${playerId}/status`]: 'revealed'
    };

    await update(ref(db), updates);
    return { success: true };
  } catch (error) {
    console.error('Error revealing nick:', error);
    return { success: false, error: error.message };
  }
};

/**
 * End the round and show results
 * @param {string} code - Room code
 * @param {object} roundResults - Results to save
 * @returns {Promise}
 */
export const endRound = async (code, roundResults) => {
  try {
    const roundNumber = roundResults.round || 1;
    const updates = {
      [`rooms/${code}/game/phase`]: 'revealing',
      [`rooms/${code}/rounds/${roundNumber}`]: {
        ...roundResults,
        endedAt: Date.now()
      }
    };

    await update(ref(db), updates);
    return { success: true };
  } catch (error) {
    console.error('Error ending round:', error);
    return { success: false, error: error.message };
  }
};

/**
 * End the entire game
 * @param {string} code - Room code
 * @param {object} winner - Winner info
 * @returns {Promise}
 */
export const endGame = async (code, winner) => {
  try {
    const updates = {
      [`rooms/${code}/game/phase`]: 'ended',
      [`rooms/${code}/game/winner`]: winner,
      [`rooms/${code}/game/endedAt`]: Date.now()
    };

    await update(ref(db), updates);
    return { success: true };
  } catch (error) {
    console.error('Error ending game:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Listen to game state changes
 * @param {string} code - Room code
 * @param {function} callback - Called when game state changes
 * @returns {function} Unsubscribe function
 */
export const onGameStateChange = (code, callback) => {
  return onValue(gameRef(code), (snapshot) => {
    callback(snapshot.val());
  });
};

/**
 * Listen to players changes
 * @param {string} code - Room code
 * @param {function} callback - Called when players change
 * @returns {function} Unsubscribe function
 */
export const onPlayersChange = (code, callback) => {
  return onValue(playersRef(code), (snapshot) => {
    callback(snapshot.val() || {});
  });
};

/**
 * Listen to attacks changes
 * @param {string} code - Room code
 * @param {function} callback - Called when attacks change
 * @returns {function} Unsubscribe function
 */
export const onAttacksChange = (code, callback) => {
  return onValue(attacksRef(code), (snapshot) => {
    callback(snapshot.val() || {});
  });
};

/**
 * Get all rounds data
 * @param {string} code - Room code
 * @returns {Promise}
 */
export const getAllRounds = async (code) => {
  try {
    const snapshot = await get(roundsRef(code));
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error getting rounds:', error);
    return {};
  }
};

/**
 * Delete a room (cleanup)
 * @param {string} code - Room code
 * @returns {Promise}
 */
export const deleteGameRoom = async (code) => {
  try {
    await set(gameRef(code), null);
    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    return { success: false, error: error.message };
  }
};

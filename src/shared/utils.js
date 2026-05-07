/* ══════════════════════════════════════════════════
   UTILITY FUNCTIONS
   - Pure functions used across the app
══════════════════════════════════════════════════ */

// ── STRING UTILITIES ──
/**
 * Make Initials from a name
 * @param {string} name - Full name
 * @returns {string} Two-letter initials
 */
export const makeInitials = (name) => {
  return name
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

/**
 * Generate a random code
 * @returns {string} 6-digit code
 */
export const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Normalize string for comparison
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
export const normalizeString = (str) => {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

// ── TIME UTILITIES ──
/**
 * Format milliseconds to readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time (e.g., "5:30" or "2 يوم 3س 15د")
 */
export const formatTime = (ms) => {
  if (!ms || ms <= 0) return '00:00';
  
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days} يوم ${hours}س ${minutes}د`;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Get countdown info for timer display
 * @param {number} countdown - Remaining milliseconds
 * @returns {object} { label, urgent }
 */
export const getCountdownInfo = (countdown) => {
  if (countdown === null) return { label: '—', urgent: false };
  if (countdown <= 0) return { label: 'انتهى الوقت!', urgent: true };
  return {
    label: formatTime(countdown),
    urgent: countdown < 5 * 60 * 1000
  };
};

// ── ARRAY UTILITIES ──
/**
 * Shuffle array
 * @param {array} arr - Input array
 * @returns {array} Shuffled copy
 */
export const shuffleArray = (arr) => {
  return [...arr].sort(() => Math.random() - 0.5);
};

/**
 * Group array by key
 * @param {array} arr - Input array
 * @param {function} keyFn - Function to get group key
 * @returns {object} Grouped object
 */
export const groupBy = (arr, keyFn) => {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

// ── OBJECT UTILITIES ──
/**
 * Deep clone object
 * @param {object} obj - Input object
 * @returns {object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merge objects
 * @param {...objects} objs - Objects to merge
 * @returns {object} Merged object
 */
export const mergeObjects = (...objs) => {
  return Object.assign({}, ...objs);
};

// ── LOCAL STORAGE ──
/**
 * Safe localStorage get
 */
export const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safe localStorage set
 */
export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to set ${key}:`, e);
  }
};

/**
 * Safe localStorage remove
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to remove ${key}:`, e);
  }
};

// ── VALIDATION ──
/**
 * Check if string is valid
 */
export const isValidString = (str, minLength = 1, maxLength = 100) => {
  return typeof str === 'string' && str.trim().length >= minLength && str.trim().length <= maxLength;
};

/**
 * Check if number is valid
 */
export const isValidNumber = (num, min = 0, max = Infinity) => {
  return typeof num === 'number' && !isNaN(num) && num >= min && num <= max;
};

// ── RANDOM ──
/**
 * Random integer between min and max
 */
export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Random element from array
 */
export const randomElement = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// ── DEVICE FINGERPRINT ──
export const getDeviceFingerprint = () => {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return btoa(`${ua}_${screen}_${tz}`).slice(0, 32);
};

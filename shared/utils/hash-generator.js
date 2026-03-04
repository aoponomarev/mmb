/**
 * #JS-9m2N115w
 * @description Stable Base58 hash from string for component instance and style markup; deterministic, avto- prefix.
 * @skill id:sk-318305
 */
window.hashGenerator = {
  // Base58 alphabet (no 0, O, I, l to avoid confusion)
  base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',

  // Deterministic Base58 hash from string (same input -> same hash)
  generateHash(input, length = 8) {
    if (!input || typeof input !== 'string') {
      input = String(input || '');
    }

    // Simple hash (djb2)
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) + input.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to Base58
    let result = '';
    const absHash = Math.abs(hash);
    let num = absHash;

    // Build Base58 string of desired length
    for (let i = 0; i < length; i++) {
      result = this.base58[num % this.base58.length] + result;
      num = Math.floor(num / this.base58.length);
      // If number exhausted, use hash remainder with offset
      if (num === 0) {
        num = absHash + (i + 1) * 37; // Offset to continue generation
      }
    }

    return result;
  },

  // Full markup class (with avto- prefix)
  generateMarkupClass(input, length = 8) {
    return `avto-${this.generateHash(input, length)}`;
  }
};


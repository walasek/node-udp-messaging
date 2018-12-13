const {MAX_MTU} = require('./Constants');

/**
 * @file A static cache to speedup binary encoding.
 * Default cache size allows containing MAX_MTU and some metadata.
 */
module.exports = Buffer.alloc(MAX_MTU+128);
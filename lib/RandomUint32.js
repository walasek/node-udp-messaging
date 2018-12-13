const crypto = require('crypto');

/**
 * @function randomUint32
 * @description A function that returns a random Uint32 number.
 * @private
 */
module.exports = function(){
	return crypto.randomBytes(4).readUInt32LE();
}
const dns = require('dns');
const debug = require('debug')('udp-messaging:dns');

/**
 * @function lookup
 * @description Perform a DNS lookup.
 * @param {String} hostname The hostname to translate.
 * @param {Object} [options] Options for dns.lookup.
 * @param {Number} [options.family=4] The IP version to resolve.
 * @returns {Promise}
 * @private
 */
module.exports = async function(hostname, options){
	return new Promise((res, rej) => {
		options = options || {};
		debug(`Resolving hostname ${hostname}`);
		dns.lookup(hostname, options || {family: 4}, (err, address) => {
			if(err){
				debug(`Could not resolve ${hostname}`);
				return rej(err);
			}
			debug(`Hostname ${hostname} is ${address}`);
			res(address);
		});
	});
}
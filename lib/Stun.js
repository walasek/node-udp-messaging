const stun = require('stun');
const { STUN_BINDING_REQUEST, STUN_ATTR_XOR_MAPPED_ADDRESS } = stun.constants;
const debug = require('debug')('reliable-udp:stun');
const lookup = require('./Lookup');

/**
 * @function stun
 * @description Performs the STUN operation. Resolves with an array containing [ip, port].
 * @returns {Promise}
 * @private
 */
module.exports = function discoverSelf(socket, options){
	return new Promise(async (res,rej) => {
		options = options || {};
		try {
			if(!options.ip)
				options.ip = await lookup(options.address || 'stun.l.google.com');
			const server = stun.createServer(socket);
			const request = stun.createMessage(STUN_BINDING_REQUEST);
			debug(`STUN requesting a binding response`);

			server.once('bindingResponse', (stunMsg) => {
				const results = {
					ip: stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value.address,
					port: stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value.port
				};
				debug(`STUN Binding Response: ${JSON.stringify(stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value)}`);

				res([results.ip, results.port]);
				setImmediate(() => server.close());
			});

			server.send(request, options.port || 19302, options.ip);
		}catch(err){
			rej(err);
		}
	});
}
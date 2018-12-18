// Networking performance benchmark
//
// Protocol:
//	1. One node should listen for a connection (-s option)
//	2. Second node should connect to a remote peer (-c option) and
//		- Send a big message, measure time
//		- Request a big message, measure time
//		- Request a big message and send a big message, measure time
//

const P2PSocket = require('../');
const crypto = require('crypto');
const optimist = require('optimist')
	.usage('A benchmarking script')
	.describe('help', 'Print help')
	.alias('help', 'h')

	.boolean('s', 'Start in server mode.')
	.boolean('c', 'Start in client mode.')
	.describe('p', 'Port to use. If -c then connect to this port, if -s then bind to this port.')
	.default('p', 12340)
;

const argv = optimist.argv;
if(argv.h)return optimist.showHelp();
if(argv._.length < 1)
	argv._.push('127.0.0.1');

const CONST = {
	BIG_MSG_PREPARE: 'BMSGP',	// Start timers
	BIG_MSG_SENT: 'BMSGS',		// End timers, print measurement
	BIG_MSG_REQUEST: 'BMSGR',	// Send PREPARE, send message
};

(async function(){
	// Create a bound socket
	console.log(`Binding a port...`);
	const p2p = new P2PSocket({ port: argv.s ? argv.p : 0 });
	await p2p.bind();
	// STUN, since it's easy
	const me = await p2p.discoverSelf();
	console.log(`Bound to local port ${p2p.port}, can be found at ${me[0]}:${me[1]}`);

	// Serialization standard
	function pack(obj){
		return Buffer.from(JSON.stringify(obj));
	}
	function unpack(raw){
		return JSON.parse(raw.toString());
	}

	// Big message sending is used in multiple places
	async function sendBigMessage(ip, port){
		console.log(`Sending a big message to ${ip}:${port}`);
		let start = Date.now();
		await p2p.sendMessage(pack({
			type: CONST.BIG_MSG_PREPARE,
		}), ip, port);
		const data = crypto.randomBytes(16*1024*1024/2).toString('ascii'); // div by 2 because 1 byte = 2 ascii chars
		await p2p.sendMessage(pack({
			type: CONST.BIG_MSG_SENT,
			data,
		}), ip, port);
		let elapsed = Date.now() - start;
		let bandwidth = data.length/elapsed;
		console.log(`Upload speed to ${ip}:${port} is ${bandwidth} Kb/s (sent ${data.length} bytes)`);
	}

	const timers = {};
	p2p.on('message', async (raw, ip, port) => {
		let message;
		try {
			message = unpack(raw);
		}catch(err){
			return;
		}
		const id = `${ip}:${port}`;
		switch(message.type){
			case CONST.BIG_MSG_PREPARE:
				// Remote end will send a big message, start timers
				console.log(`Awaiting message from ${id}`);
				timers[id] = Date.now();
				break;
			case CONST.BIG_MSG_SENT:
				// Received a big message, end timers
				if(timers[id]){
					const elapsed = Date.now() - timers[id];
					const bandwidth = message.data.length / elapsed; // Kb
					console.log(`Download speed from ${id} is ${bandwidth} Kb/s (got ${message.data.length} bytes)`);
					delete timers[id];
				}
				break;
			case CONST.BIG_MSG_REQUEST:
				sendBigMessage(ip, port);
				break;
		}
	});

	if(argv.c){
		await sendBigMessage(argv._[0], argv.p);
		p2p.sendMessage(pack({
			type: CONST.BIG_MSG_REQUEST,
		}), argv._[0], argv.p),
		await new Promise(res => p2p.once('message', _ => res())), // PREPARE
		await new Promise(res => p2p.once('message', _ => res())), // SENT, shows stats
		console.log('Done.');
		setTimeout(() => p2p.close(), 500);
	}
})();
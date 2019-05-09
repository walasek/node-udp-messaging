// P2P Discovery Example App
//
// Protocol:
//	1. A peer shall connect to other known peers
//	2. Connection goes as follows:
//		- Send a connection challenge
//		- Peer should respond with a connection response
//	3. Connected peers can now exchange a discovery action:
//		- Send a discovery request
//		- A peer should respond with a single known peer address
//		- To verify the address a connection should be made
//

const P2PSocket = require('../');
const debug = require('debug')('udp-messaging:discovery');
const optimist = require('optimist')
	.usage('Run a P2P discovery node')
	.describe('help', 'Print help')
	.alias('help', 'h')

	.describe('local_port', 'Use a specific local port, 0 for random')
	.default('local_port', 0)
	.alias('local_port', 'p')

	.describe('remote_ip', 'Define a known remote peer')
	.default('remote_ip', '127.0.0.1')
	.alias('remote_ip', 't')

	.describe('remote_port', 'Define remote peer port')
	.alias('remote_port', 'r')

	.describe('stun_xval', 'Interval between STUN requests [ms]')
	.alias('stun_xval', 's')
	.default('stun_xval', 60000)
;

const argv = optimist.argv;
if(argv.h)return optimist.showHelp();

const CONST = {
	CONNECTION_CHALLENGE: 'CHALL',
	CONNECTION_RESPONSE: 'RESP',

	DISCOVERY_REQUEST: 'DISCV',
	DISCOVERY_RESPONSE: 'PEERR',
};

(async function() {
	// We need a port to receive UDP packets
	// Sending packets needs a bound port too since we listen for ACKs
	debug(`Binding a port...`);
	const p2p = new P2PSocket({ port: argv.local_port });
	await p2p.bind();
	debug(`Using local port ${p2p.port}`);

	// We need a publicly available address for this peer
	debug(`Discovering self...`);
	let my_ip, my_port;
	async function _tick_discover(){
		const [new_ip, new_port] = await p2p.discoverSelf();
		debug(`Other peers can see me at ${my_ip}:${my_port}`);
		if(my_ip && my_port){
			if(new_ip != my_ip || new_port != my_port){
				console.log(`WARNING! External port or ip changed ${my_ip}:${my_port} -> ${new_ip}:${new_port}`);
			}
		}else{
			console.log(`Can reach self at ${new_ip}:${new_port}`);
		}
		my_ip = new_ip;
		my_port = new_port;
	}
	await _tick_discover();
	// NATs like to change things from time to time
	// Update our port number regularly
	setInterval(_tick_discover, argv.stun_xval);

	let peers = [], candidates = [];
	// Allow registering new peers and updating known ones
	function note_peer_activity(ip, port){
		const match = peers.filter(p => p.ip == ip && p.port == port);
		if(match[0]){
			match[0].last_time_active = Date.now();
		}else{
			debug(`Registering new peer ${ip}:${port}`);
			console.log(`Discovered ${ip}:${port}`);
			peers.push({
				ip, port,
				last_time_active: Date.now(),
				alive: true,		// Does this peer respond to messages?
				awaiting_discovery: false, // Did we send a discovery request?
				last_conn_attempt: null, // Last connection attempt
				conn_attempts: 0,
			});
		}
	}
	// Allow registering candidate peers
	function note_candidate(ip, port){
		if(candidates.filter(c => c.ip == ip && c.port == port).length == 0){
			candidates.push({ip, port, failed: false});
		}
	}
	// Allow adding information of at least one other peer
	if(argv.remote_ip && argv.remote_port)
		note_candidate(argv.remote_ip, argv.remote_port);
	// Also add yourself, will force a dummy local connection
	note_candidate(my_ip, my_port);

	// Agree on the type of serialization/deserialization
	function pack(obj){
		return Buffer.from(JSON.stringify(obj));
	}
	function unpack(raw){
		return JSON.parse(raw.toString());
	}

	function _tick_peers(){
		// Remove invalid peers here
		peers = peers.filter(p => p.alive);
		peers.forEach(async (peer) => {
			try {
				if(!peer.alive)
					return;
				peer.last_conn_attempt = new Date().valueOf()/1000;
				await p2p.sendMessage(pack({
					type: CONST.DISCOVERY_REQUEST,
				}), peer.ip, peer.port);
				note_peer_activity(peer.ip, peer.port);
				peer.awaiting_discovery = true;
			}catch(err){
				// Remote end did not respond, peer should be invalidated
				if(peer.alive){
					debug(`Remote peer ${peer.ip}:${peer.port} did not respond, dropping`);
					peer.alive = false;
				}
			}
		});
	}
	// Every now and then send a discovery request to all known peers
	setInterval(_tick_peers, 3000);

	function _tick_candidates(){
		// Attempt remote peer authentication here
		// Prevents hacking attempts
		// Also ignore candidates that are already in the peer list
		const t = new Date().valueOf()/1000;
		const CANDIDATE_RETICK_TIME = 60000;
		const CANDIDATE_ATTEMPT_LIMIT = (1000*60*60*24*7)/CANDIDATE_RETICK_TIME; // Effective 7 days of "remembering" a remote peer
		candidates = candidates.filter(c =>
			// Drop connections that reached attempt limit
			c.conn_attempts < CANDIDATE_ATTEMPT_LIMIT &&
			// Not already connected
			peers.filter(p => p.ip == c.ip && p.port == c.port && p.alive).length == 0
		);
		candidates.forEach(async (candidate) => {
			if(c.failed && t-c.last_conn_attempt < CANDIDATE_RETICK_TIME)
				return;
			try {
				peer.last_conn_attempt = t;
				peer.conn_attempts++;
				await p2p.sendMessage(pack({
					type: CONST.CONNECTION_CHALLENGE,
				}), candidate.ip, candidate.port);
			}catch(err){
				if(!candidate.failed){
					debug(`Candidate ${candidate.ip}:${candidate.port} did not respond`);
					candidate.failed = true;
				}
			}
		});
		debug(`Sent out ${candidates.length} candidate challenges`);
	}
	// Every now and then attempt connection to new peers
	setInterval(_tick_candidates, 1000);

	// Every now and then print known peers
	setInterval(() => {
		console.log(`Known peers: ${peers.map(p => `${p.ip}:${p.port}`).join(' ')}`);
	}, 30000);

	p2p.on('message', (raw, ip, port) => {
		let message;
		try {
			message = unpack(raw);
		}catch(err){
			// Gotta be careful
			return;
		}
		debug(`From %s:%d got %j`, ip, port, message);

		// These message types do not require confirmed connections
		switch(message.type){
			case CONST.CONNECTION_CHALLENGE:
				// Always respond to challenges
				debug(`Got a challenge from ${ip}:${port}`);
				p2p.sendMessage(pack({
					type: CONST.CONNECTION_RESPONSE
				}), ip, port);
				// Remember to attempt a reverse connection later
				note_candidate(ip, port);
				return;
			case CONST.CONNECTION_RESPONSE:
				// Accept responses only from candidates
				if(candidates.filter(c => c.ip == ip && c.port == port).length > 0){
					debug(`Challenge confirmed, peer is valid`);
					note_peer_activity(ip, port);
					candidates = candidates.filter(c => c.ip != ip && c.port != port);
				}else{
					debug(`A peer attempted to respond to a connection that was never made`);
				}
				return;
		}
		const peer = peers.filter(p => p.ip == ip && p.port == port)[0];
		if(!peer){
			note_candidate(ip, port);
			return;
		}
		note_peer_activity(ip, port);
		// These options require confirmed connections
		// Also, only note confirmed peers
		switch(message.type){
			case CONST.DISCOVERY_REQUEST:
				// Remote end requests a peer
				if(peers.length == 0)
					break;
				const random_peer = peers[Math.floor(Math.random()*peers.length)];
				p2p.sendMessage(pack({
					type: CONST.DISCOVERY_RESPONSE,
					ip: random_peer.ip,
					port: random_peer.port,
				}), ip, port);
				peer.awaiting_discovery = true;
				return;
			case CONST.DISCOVERY_RESPONSE:
				// Remote end responds with a peer
				if(!peer.awaiting_discovery){
					debug(`Peer tried to send a discovery response, but we werent waiting`);
					break;
				}
				peer.awaiting_discovery = false;
				if(
					// Ignore local ip
					!(message.ip == p2p.ip && message.port == p2p.port) &&
					// Ignore nat ip
					!(message.ip == my_ip && message.port == my_port) &&
					// Don't duplicate candidates
					candidates.filter(c => c.ip == message.ip && c.port == message.port).length == 0 &&
					// Ignore if already connected
					peers.filter(p => p.ip == message.ip && p.port == message.port).length == 0 &&
					// Prevent too many entries
					candidates.length < 100
				){
					debug(`Received a new candidate ${message.ip}:${message.port}`);
					note_candidate(message.ip, message.port);
				}else{
					//debug(`Ignored a candidate`);
				}
				return;
			default:
				debug(`Invalid message type ${message.type}`);
		}
	});
})();
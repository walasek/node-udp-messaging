const debug = require('debug')('udp-messaging:socket');
const stunAlgorithm = require('./Stun');
const DatagramDecode = require('./Protocol');
const MessageSendSupervisor = require('./MessageSendSupervisor');
const MessageRecvSupervisor = require('./MessageRecvSupervisor');
const randomUint32 = require('./RandomUint32');
const {MAX_MTU,PROTOCOL_ID} = require('./Constants');
const dgram = require('dgram');
const EventEmitter = require('events');

/**
 * @class
 * A socket that handles receiving and sending messages.
 * @augments EventEmitter
 */
class MessagingSocket extends EventEmitter {
	/**
	 * @constructor
	 * @param {Object} [options] Pass options to the constructor.
	 * @param {String} [options.ip=0.0.0.0] IP address to bind to.
	 * @param {Number} [options.port=0] Port number to bind to. Defaults to 0 (random free port).
	 * @param {Object} [options.socket=null] Use an existing socket. If null then creates a new _udp4_ socket.
	 * @param {Number} [options.MTU=1400] Use a different MTU value. Messages longer than MTU are divided into subpackets.
	 */
	constructor(options){
		super();
		options = options || {};
		// Initialize variables
		this.port = options.port || 0;
		this.ip = options.ip || '0.0.0.0';
		this.socket = options.socket || null;
		this.pending_sends = [];
		this.pending_recv = [];
		this.pending_recv_map = {};
		this.last_known_ids = [];
		this.last_known_ids_map = {};
		this.last_known_ids_positions = {};
		this.MTU = options.MTU || MAX_MTU;
		this.queue_send = [];
		this.queue_recv = [];
		//this.think_xval = setInterval(() => this.think(), 1);
		this.think_xval = setTimeout(() => this.think(), 1);
		if(options.MTU > MAX_MTU)
			throw new Error('Cannot increase the MTU above '+MAX_MTU);
	}
	/**
	 * Binds the socket and configures datagram handling.
	 * @returns {Promise}
	 */
	bind(){
		return new Promise((res, rej) => {
			if(!this.socket)
				this.socket = dgram.createSocket('udp4');
			const handleErrors = (err) => {
				this.socket = null;
				debug(`Binding to ${this.address}:${this.port} failed with ${err}`);
				rej(err);
			};
			this.socket.once('error', handleErrors);
			debug(`Attempting to bind to ${this.address}:${this.port}`);
			this.socket.bind({
				port: this.port,
				address: this.address,
				exclusive: true
			}, () => {
				this.socket.removeListener('error', handleErrors);
				//this.socket.unref();
				if(this.port && this.port !== this.socket.address().port)
					throw Error('Could not bind to port '+this.port);
				this.port = this.socket.address().port;
				this.socket.on('message', (data, rinfo) => this.queue_recv.push([data, rinfo]));
				debug(`Binding to ${this.address}:${this.port} successful`);
				res();
			});
		});
	}
	/**
	 * Closes the socket, removes all listeners, abandons all Message Supervisors.
	 */
	close(){
		if(this.socket){
			this.socket.close();
			this.socket.removeAllListeners();
		}
		this.removeAllListeners();
		this.pending_sends.forEach(send => send.abandon());
		this.pending_recv.forEach(recv => recv.abandon());
		clearTimeout(this.think_xval);
	}
	/**
	 * Send a raw datagram to a remote host.
	 * @param {Buffer} data The datagram data.
	 * @param {String} address Target host ip address.
	 * @param {Number} port Target host port number.
	 */
	send(data, address, port){
		if(!port || !address)
			throw new Error(`Attempted to send a datagram to an invalid address ${address} port ${port}`);
		if(this.queue_send.length < 10000)
			return new Promise(done => this.queue_send.push([data, address, port, done]));
	}
	think(){
		// Send a packet from the queue_send
		for(let i = 0; i < 20; i++){
			if(this.queue_send.length > 0){
				const q = this.queue_send.shift();
				this.socket.send(q[0], q[2], q[1], q[3]);
			}else{
				break;
			}
		}
		// Process recvd
		for(let i = 0; i < 20; i++){
			if(this.queue_recv.length > 0){
				const q = this.queue_recv.shift();
				this.handleDatagram(q[0], q[1]);
			}else{
				break;
			}
		}
		this.think_xval = setTimeout(() => this.think(), 1);
	}
	/**
	 * Perform a STUN request.
	 * @param {String} [server] The STUN server to use.
	 * @returns {Array} An array containing [ip, port]
	 */
	discoverSelf(server){
		return stunAlgorithm(this.socket, server);
	}
	/**
	 * Handle an incoming datagram.
	 * @param {Buffer} data Raw datagram data.
	 * @param {Object} rinfo Remote host information.
	 * @param {String} rinfo.address Remote host ip address.
	 * @param {Number} rinfo.port Remote host port number.
	 */
	handleDatagram(data, rinfo){
		let datagram;
		try {
			datagram = DatagramDecode.decode(data);
		}catch(err){
			debug(`Unknown datagram from ${rinfo.address}:${rinfo.port} %o`, data);
			return;
		}
		const message = datagram.message;
		debug(`Port ${this.port} received ${data.length} bytes: %O`, message);
		if(message.data_part){
			// Pass to a message supervisor
			// Allow sending a re-send request just in case
			// Allow sending ACKs
			let recv_handler = this.pending_recv_map[message.data_part.message_id];
			if(!recv_handler){
				if(this.last_known_ids_map[message.data_part.message_id]){
					// Send an ACK, supervisor's one might have been lost
					// TODO: Remember which message_ids correspond to rinfos
					//		 Otherwise DDOS risk
					if(this.last_known_ids_positions[message.data_part.message_id]){
						debug(`Re-sending an ACK for message ${message.data_part.message_id}, was probably lost`);
						this.send(DatagramDecode.encode({
							protocol: PROTOCOL_ID,
							message: {
								data_ack: {
									message_id: message.data_part.message_id,
									position: this.last_known_ids_positions[message.data_part.message_id],
								}
							}
						}), rinfo.address, rinfo.port);
					}
					return;
				}
				if(message.data_part.position === 0){
					// This might be a new incomming message
					if(!recv_handler){
						if(this.last_known_ids_map[message.data_part.message_id])
							return;
						if(this.pending_recv.length > 2000)
							return debug(`A new message could be received, but already at max`);
						debug(`Starting a new message receiver supervisor for message ${message.data_part.message_id}`);
						const sup = new MessageRecvSupervisor({
							ip: rinfo.address,
							port: rinfo.port,
							message_id: message.data_part.message_id,
							parent: this,
						});
						this.pending_recv.push(sup);
						this.pending_recv_map[sup.options.message_id] = sup;
						recv_handler = sup;
					}
				}
			}
			// Don't use else since a few lines above a handler is created
			if(recv_handler){
				recv_handler.onDataPart(message.data_part.position, message.data_part.data, message.data_part.is_last);
				if(recv_handler.done){
					if(recv_handler.data){
						debug(`Receiver supervisor for ${message.data_part.message_id} reporting end of work`);
						/**
						 * Full message received.
						 * @event MessagingSocket#message
						 * @property {Buffer} data Message content.
						 * @property {String} ip Sender ip address.
						 * @property {Number} port Sender port number.
						 */
						this.emit('message', recv_handler.data, rinfo.address, rinfo.port);
					}
					// Some receivers might have timed out already
					const pending_recv_to_remove = this.pending_recv.filter(r => r.done);
					pending_recv_to_remove.forEach(p => {
						delete this.pending_recv_map[p.options.message_id];
					});
					this.pending_recv = this.pending_recv.filter(r => !r.done);

					// Remember the id for some more time
					// Prevents duplicates
					if(recv_handler.data){
						this.last_known_ids.push(message.data_part.message_id);
						this.last_known_ids_map[message.data_part.message_id] = true;
						this.last_known_ids_positions[message.data_part.message_id] = recv_handler.data.length;
					}
				}
			}
			// Else unexpected message part anyways, ignore
			return;
		}
		if(message.data_resend){
			for(let send of this.pending_sends){
				if(send.options.send_id == message.data_resend.message_id){
					send.onResendRequest(message.data_resend.position);
					return;
				}
			}
			// Unknown message id
		}
		if(message.data_ack){
			for(let send of this.pending_sends){
				if(send.options.send_id == message.data_ack.message_id){
					send.onDataACK(message.data_ack.position);
					return;
				}
			}
			// Unknown message id
		}
	}
	/**
	 * Send a message to a remote host.
	 * The remote host must also use this library to receive and understand the data.
	 * @param {Buffer} data The message contents.
	 * @param {String} ip Remote host ip address.
	 * @param {Number} port Remote host port number.
	 * @returns {Promise} Message delivery promise. Resolves when a message is fully received _or the socket is closed_. Rejects if the remote end did not respond.
	 */
	sendMessage(data, ip, port){
		return new Promise((res,rej) => {
			// Generate a unique id for this message
			// The while loop will most likely be executed only once
			let send_id;
			while(!send_id){
				send_id = randomUint32();
				if(this.last_known_ids_map[send_id])
					continue;
				for(let send of this.pending_sends){
					if(send.options.send_id === send_id)
						continue;
				}
			}
			if(this.last_known_ids.length >= 10000){
				const key = this.last_known_ids.shift();
				delete this.last_known_ids_map[key];
				delete this.last_known_ids_positions[key];
			}
			const _post = () => {
				this.last_known_ids.push(send_id);
				this.last_known_ids_map[send_id] = true;
				this.last_known_ids_positions[send_id] = 0; // Senders dont need this
				res(...arguments);
			}
			debug(`Sending ${data.length} bytes with id ${send_id}`);
			this.pending_sends.push(
				new MessageSendSupervisor({
					data, ip, port, res: _post, rej, send_id,
					parent: this,
				})
			);
		});
	}
}

module.exports = MessagingSocket;
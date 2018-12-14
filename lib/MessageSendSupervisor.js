const DatagramDecode = require('./Protocol');
const {PROTOCOL_ID} = require('./Constants');
const Cache = require('./EncodingStash');
const debug = require('debug')('udp-messaging:send');

const RESEND_XVAL = 400;
const DEATH_XVAL = 10000;
const THINK_XVAL = Math.min(RESEND_XVAL, DEATH_XVAL);

/**
 * @class
 * Message sending supervisor.
 * @private
 */
class MessageSendSupervisor {
	/**
	 * @constructor
	 * @param {Object} options A generic object with references to use.
	 * @param {Object} options.parent The parent {@link MessagingSocket} object.
	 * @param {Number} options.send_id The message id to use.
	 * @param {String} options.ip The IP address to send to.
	 * @param {Number} options.port The port number to send to.
	 * @param {Buffer} options.data The message to send.
	 * @param {function} options.res The resolve function.
	 * @param {function} options.rej The reject function.
	 */
	constructor(options){
		this.options = options;
		this.last_confirmed_pos = 0;
		this.next_send_pos = 0;
		this.next_pos = 0;
		this.last_part_pos = -1;
		this.done = false;
		this.sendPart(0);
		this.resend_xval = setInterval(() => this.think(), THINK_XVAL);
		this.last_activity = Date.now();
	}
	/**
	 * Interrupt sending of the message.
	 * Resolves the promise.
	 */
	abandon(){
		clearInterval(this.resend_xval);
		this.options.res('Socket closing');
	}
	/**
	 * Send a part of the message. Sends up to MTU bytes of the message + some metadata.
	 * @param {Number} position The position to send from.
	 */
	async sendPart(position){
		const FORWARD_SEND_COUNT = 100;
		for(let i = 0; i < FORWARD_SEND_COUNT; i++){
			const end = position+this.options.parent.MTU;
			DatagramDecode.encode({
				protocol: PROTOCOL_ID,
				message: {
					data_part: {
						message_id: this.options.send_id,
						position,
						data: this.options.data.slice(position, end),
						is_last: end >= this.options.data.length ? 1 : 0,
					}
				}
			}, Cache);
			const buf = Buffer.allocUnsafe(DatagramDecode.last_bytes_encoded);
			Cache.copy(buf, 0, 0, DatagramDecode.last_bytes_encoded);
			debug(`Sending a partial of size ${buf.length} bytes (position ${position}) to ${this.options.ip}:${this.options.port}`);
			this.options.parent.send(buf, this.options.ip, this.options.port);
			position = end;
			this.next_send_pos = end;
			if(end > this.options.data.length){
				this.last_part_pos = this.options.data.length;
				break;
			}
		}
	}
	/**
	 * Handle an ACK from the remote end.
	 * @param {Number} position The position reported by the remote end.
	 */
	onDataACK(position){
		// Send more simultanous parts
		if(this.last_part_pos === position){
			debug(`Message sender id ${this.options.send_id} done`);
			this.done = true;
			setImmediate(() => this.options.res());
			clearInterval(this.resend_xval);
		}else{
			debug(`Received ack for position ${position}`);
			this.last_confirmed_pos = position;
			if(position >= this.next_send_pos)
				this.sendPart(position);
		}
		this.last_activity = Date.now();
	}
	/**
	 * Handle a resend request received from the remote end.
	 * @param {Number} position The position requested.
	 */
	onResendRequest(position){
		this.sendPart(position);
		this.last_activity = Date.now();
	}
	/**
	 * Perform intervaled operations like timeouts.
	 */
	think(){
		const now = Date.now();
		if(now - this.last_activity > DEATH_XVAL){
			this.done = true;
			clearInterval(this.resend_xval);
			this.options.rej('Remote end not responding');
			return;
		}
		if(now - this.last_activity > RESEND_XVAL)
			this.sendPart(this.last_confirmed_pos);
	}
}

module.exports = MessageSendSupervisor;
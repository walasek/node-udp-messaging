const DatagramDecode = require('./Protocol');
const {PROTOCOL_ID} = require('./Constants');
const Cache = require('./EncodingStash');
const debug = require('debug')('udp-messaging:recv');

const RECEIVE_TIMEOUT = 10000;
const RESEND_TIME_LIMIT = 60;
const THINK_XVAL = RECEIVE_TIMEOUT;

/**
 * @class
 * Message rebuilding supervisor.
 * @private
 */
class MessageRecvSupervisor {
	/**
	 * @constructor
	 * @param {Object} options A generic object with references to use.
	 * @param {String} options.ip Sender IP.
	 * @param {Number} options.port Sender port number.
	 * @param {Number} options.message_id The message ID to receive.
	 * @param {MessagingSocket} options.parent The parent {@link MessagingSocket} object.
	 */
	constructor(options){
		this.options = options;
		this.data_parts = [];
		this.data_length = 0;
		//this.data = Buffer.from([]);
		this.data = null;
		this.done = false;
		this.timeout_xval = setInterval(() => this.think(), THINK_XVAL);
		this.last_activity = Date.now();
		this.last_resend_time = 0;
	}
	/**
	 * Interrupt further rebuilding of this message.
	 */
	abandon(){
		clearInterval(this.timeout_xval);
		this.done = true;
		this.data = null;
		this.data_parts = null;
	}
	/**
	 * Request a re-send of the currently expected data part.
	 */
	sendResendRequest(){
		const slice = DatagramDecode.encode({
			protocol: PROTOCOL_ID,
			message: {
				data_resend: {
					message_id: this.options.message_id,
					position: this.data_length,
				}
			}
		}, Cache);
		const buf = Buffer.allocUnsafe(slice.length);
		Cache.copy(buf, 0, 0, slice.length);
		this.options.parent.send(buf, this.options.ip, this.options.port);
	}
	/**
	 * Send an ACK datagram that allows the remote end to send further parts of the message.
	 * @param {Number} position The position to report.
	 */
	sendACK(position){
		debug(`Sending ACK for message ${this.options.message_id} position ${position}`);
		const slice = DatagramDecode.encode({
			protocol: PROTOCOL_ID,
			message: {
				data_ack: {
					message_id: this.options.message_id,
					position,
				}
			}
		}, Cache);
		const buf = Buffer.allocUnsafe(slice.length);
		Cache.copy(buf, 0, 0, slice.length);
		this.options.parent.send(buf, this.options.ip, this.options.port);
	}
	/**
	 * Handle incoming data.
	 * @param {Number} position The position of this data part.
	 * @param {Buffer} data The data part.
	 * @param {Number} is_last A pseudo-boolean indicating if this is the last message part (0-false, >0-true).
	 */
	onDataPart(position, data, is_last){
		if(this.done)
			return;
		this.last_activity = Date.now();
		if(position === this.data_length){
			debug(`Reading data`);
			//this.data = Buffer.concat([this.data, data]);
			this.data_parts.push(data);
			this.data_length += data.length;
			this.sendACK(this.data_length);
			if(is_last > 0){
				debug(`Reporting finished`);
				clearInterval(this.timeout_xval);
				this.data = Buffer.concat(this.data_parts);
				this.data_parts = null;
				this.done = true;
			}
		}else{
			if(position > this.data_length){
				if(Date.now() - this.last_resend_time > RESEND_TIME_LIMIT){
					debug(`Out of order data part, got ${position} need ${this.data_length}`);
					this.sendResendRequest();
					this.last_resend_time = Date.now();
				}
			}
		}
	}
	think(){
		const now = Date.now();
		if(now - this.last_activity > RECEIVE_TIMEOUT){
			this.abandon();
			return;
		}
	}
}

module.exports = MessageRecvSupervisor;
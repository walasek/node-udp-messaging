const DatagramDecode = require('./Protocol');
const {PROTOCOL_ID} = require('./Constants');
const Cache = require('./EncodingStash');
const debug = require('debug')('udp-messaging:recv');

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
		this.data = Buffer.from([]);
		this.done = false;
	}
	/**
	 * Interrupt further rebuilding of this message.
	 */
	abandon(){
		//
	}
	/**
	 * Request a re-send of the currently expected data part.
	 */
	sendResendRequest(){
		DatagramDecode.encode({
			protocol: PROTOCOL_ID,
			message: {
				data_resend: {
					message_id: this.options.message_id,
					position: this.data.length,
				}
			}
		}, Cache);
		const buf = Buffer.allocUnsafe(DatagramDecode.last_bytes_encoded);
		Cache.copy(buf, 0, 0, DatagramDecode.last_bytes_encoded);
		this.options.parent.send(buf, this.options.ip, this.options.port);
	}
	/**
	 * Send an ACK datagram that allows the remote end to send further parts of the message.
	 * @param {Number} position The position to report.
	 */
	sendACK(position){
		debug(`Sending ACK for message ${this.options.message_id} position ${position}`);
		DatagramDecode.encode({
			protocol: PROTOCOL_ID,
			message: {
				data_ack: {
					message_id: this.options.message_id,
					position,
				}
			}
		}, Cache);
		const buf = Buffer.allocUnsafe(DatagramDecode.last_bytes_encoded);
		Cache.copy(buf, 0, 0, DatagramDecode.last_bytes_encoded);
		this.options.parent.send(buf, this.options.ip, this.options.port);
	}
	/**
	 * Handle incoming data.
	 * @param {Number} position The position of this data part.
	 * @param {Buffer} data The data part.
	 * @param {Number} is_last A pseudo-boolean indicating if this is the last message part (0-false, >0-true).
	 */
	onDataPart(position, data, is_last){
		if(position === this.data.length){
			debug(`Reading data`);
			this.data = Buffer.concat([this.data, data]);
			this.sendACK(this.data.length);
			if(is_last > 0){
				debug(`Reporting finished`);
				this.done = true;
			}
		}else{
			debug(`Out of order data part, got ${position} need ${this.data.length}`);
			this.sendResendRequest();
		}
	}
}

module.exports = MessageRecvSupervisor;
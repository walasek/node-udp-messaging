const bin = require('binary-encoder');
const {PROTOCOL_ID} = require('./Constants');

/**
 * @file Defines the structure of datagrams exchanged between peers.
 * Allows consistent and efficient encoding and decoding of buffers into objects.
 */

const DataPartMessage = bin.Structure({
	message_id: bin.Uint32(),
	position: bin.Uint32(),
	is_last: bin.Optional(bin.Uint8()),
	data: bin.Data(),
});

const DataPositionalMessage = bin.Structure({
	message_id: bin.Uint32(),
	position: bin.Uint32(),
});

const Datagram = bin.Structure({
	protocol: bin.Constant(PROTOCOL_ID),
	message: bin.OneOf({
		data_part: DataPartMessage,
		data_resend: DataPositionalMessage,
		data_ack: DataPositionalMessage,
	}),
});

module.exports = Datagram;
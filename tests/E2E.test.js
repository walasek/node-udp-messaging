const Socket = require('../');
const dgram = require('dgram');
const debug = require('debug')('udp-messaging:tests');

function makeSocketLossy(socket, loss_chance, DELAY, delay){
	const _original_send = socket.send;
	socket.send = function(){
		if(Math.random() > loss_chance){
			if(delay){
				setTimeout(() => _original_send.apply(socket, arguments), delay);
			}else{
				_original_send.apply(socket, arguments);
			}
		}else{
			debug(`Packet lost!`);
		}
	}
}

module.exports = async function(test){
	for(let delayed = 0; delayed <= 4; delayed++){
		const DELAY = 500*delayed;
		for(let lossy = 0; lossy <= 2; lossy++){
			const LOSS = 0.15*lossy;
			await test(`E2E ${lossy ? `${LOSS*100}% loss` : 'non lossy'}, ${delayed ? `${DELAY} ms delay` : 'non delayed'} suite:`, async (t) => {
				await t.test('E2E #1 - can exchange small messages over stunned ports', async (t) => {
					const sock1 = dgram.createSocket('udp4');
					const sock2 = dgram.createSocket('udp4');
					const h1 = new Socket({socket: sock1});
					const h2 = new Socket({socket: sock2});
					await h1.bind();
					await h2.bind();
					const pub1 = await h1.discoverSelf();
					const pub2 = await h2.discoverSelf();
					t.ok(pub1[0]);
					t.ok(pub1[1]);
					t.ok(pub2[0]);
					t.ok(pub2[1]);
					t.notEqual(pub1[1], pub2[1]);
					t.equal(pub1[0], pub2[0]);
					if(lossy){
						makeSocketLossy(sock1, LOSS, DELAY);
						makeSocketLossy(sock2, LOSS, DELAY);
					}

					const MSG = 'ABC';
					try {
						let p = h1.sendMessage(Buffer.from(MSG), pub2[0], pub2[1]);
						await Promise.all([new Promise(res => {
							h2.once('message', (recvd) => {
								t.equal(recvd.toString('ascii'), MSG);
								res();
							});
						}), p]);

						const MSG2 = 'CDE';
						p = h2.sendMessage(Buffer.from(MSG2), pub1[0], pub1[1]);
						await Promise.all([new Promise(res => {
							h1.once('message', recvd => {
								t.equal(recvd.toString('ascii'), MSG2);
								res();
							});
						}), p]);
					}finally{
						h1.close();
						h2.close();
					}
				});
				await t.test('E2E #2 - can exchange parallel full-duplex messages over stunned ports', async (t) => {
					const sock1 = dgram.createSocket('udp4');
					const sock2 = dgram.createSocket('udp4');
					const h1 = new Socket({socket: sock1});
					const h2 = new Socket({socket: sock2});
					await h1.bind();
					await h2.bind();
					const pub1 = await h1.discoverSelf();
					const pub2 = await h2.discoverSelf();
					t.ok(pub1[0]);
					t.ok(pub1[1]);
					t.ok(pub2[0]);
					t.ok(pub2[1]);
					t.notEqual(pub1[1], pub2[1]);
					t.equal(pub1[0], pub2[0]);

					if(lossy){
						makeSocketLossy(sock1, LOSS, DELAY);
						makeSocketLossy(sock2, LOSS, DELAY);
					}
					function *gen(){
						for(let i = 0; i < 1000; i++)
							yield ('MSG'+i+'/').padEnd(1024, 'AYAYA'+i+'-');
					}
					const MSGS = [...gen()];
					const q1 = MSGS.slice();
					const q2 = MSGS.slice();
					try {
						const start = Date.now();
						let sum_size = 0;
						MSGS.forEach(msg => {
							h1.sendMessage(Buffer.from(msg), pub2[0], pub2[1]);
							h2.sendMessage(Buffer.from(msg), pub1[0], pub1[1]);
							sum_size += msg.length*2;
						});
						await new Promise((res,rej) => {
							let h1_rec_count = 0, h2_rec_count = 0;
							h2.on('message', _ => {
								h2_rec_count++;
								const at = q2.indexOf(_.toString());
								if(at === -1)
									throw new Error('Host 2 received a message duplicate '+_);
								q2.splice(at,1);
								//console.log(`At ${h2_rec_count}/${h1_rec_count} - ${MSGS.length}`);
								if(h2_rec_count === h1_rec_count && h1_rec_count === MSGS.length)
									res();
							});
							h1.on('message', _ => {
								h1_rec_count++;
								const at = q1.indexOf(_.toString());
								if(at === -1)
									throw new Error('Host 1 received a message duplicate '+_);
								q1.splice(at,1);
								//console.log(`At ${h2_rec_count}/${h1_rec_count} - ${MSGS.length}`);
								if(h2_rec_count === h1_rec_count && h1_rec_count === MSGS.length)
									res();
							});
						});
						const elapsed = Date.now() - start;
						t.test(`E2E #2 Summary: Time elapsed ${elapsed/1000} sec. Bandwidth: ${(sum_size)/(elapsed)} Kb/s`, () => {});
					}finally{
						h1.close();
						h2.close();
					}
				});
				await t.test('E2E #3 - can exchange large messages half-duplex over stunned ports', async (t) => {
					const sock1 = dgram.createSocket('udp4');
					const sock2 = dgram.createSocket('udp4');
					const h1 = new Socket({socket: sock1});
					const h2 = new Socket({socket: sock2});
					await h1.bind();
					await h2.bind();
					const pub1 = await h1.discoverSelf();
					const pub2 = await h2.discoverSelf();
					t.ok(pub1[0]);
					t.ok(pub1[1]);
					t.ok(pub2[0]);
					t.ok(pub2[1]);
					t.notEqual(pub1[1], pub2[1]);
					t.equal(pub1[0], pub2[0]);

					if(lossy){
						makeSocketLossy(sock1, LOSS, DELAY);
						makeSocketLossy(sock2, LOSS, DELAY);
					}
					try {
						const start = Date.now();
						const MSG = Buffer.allocUnsafe(65535*2);
						let p = h1.sendMessage(MSG, pub2[0], pub2[1]);
						await Promise.all([new Promise(res => {
							h2.once('message', (recvd) => {
								t.equal(Buffer.compare(recvd, MSG), 0);
								res();
							});
						}), p]);
						const elapsed = Date.now() - start;

						const MSG2 = Buffer.allocUnsafe(65535*2);;
						p = h2.sendMessage(Buffer.from(MSG2), pub1[0], pub1[1]);
						await Promise.all([new Promise(res => {
							h1.once('message', recvd => {
								t.equal(Buffer.compare(recvd, MSG2), 0);
								res();
							});
						}), p]);
						t.test(`E2E #3 Summary: Time elapsed ${elapsed/1000} sec. Bandwidth: ${(MSG.length)/(elapsed)} Kb/s`, () => {});
					}finally{
						h1.close();
						h2.close();
					}
				});
			});
		}
	}
}
const Socket = require('../');

module.exports = async function(test){
	await test('E2E #1 - can exchange small messages over stunned ports', async (t) => {
		const h1 = new Socket();
		const h2 = new Socket();
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
	await test('E2E #2 - can exchange parallel messages over stunned ports', async (t) => {
		const h1 = new Socket();
		const h2 = new Socket();
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

		function *gen(){
			for(let i = 0; i < 1000; i++)
				yield ('MSG'+i+'/').padEnd(1024, 'AYAYA'+i+'-');
		}
		const MSGS = [...gen()];
		const q1 = MSGS.slice();
		const q2 = MSGS.slice();
		try {
			MSGS.forEach(msg => {
				h1.sendMessage(Buffer.from(msg), pub2[0], pub2[1]);
				h2.sendMessage(Buffer.from(msg), pub1[0], pub1[1]);
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
		}finally{
			h1.close();
			h2.close();
		}
	});
	await test('E2E #3 - can exchange huge messages over stunned ports', async (t) => {
		const h1 = new Socket();
		const h2 = new Socket();
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

		try {
			const MSG = Buffer.allocUnsafe(65535*2);
			let p = h1.sendMessage(MSG, pub2[0], pub2[1]);
			await Promise.all([new Promise(res => {
				h2.once('message', (recvd) => {
					t.equal(Buffer.compare(recvd, MSG), 0);
					res();
				});
			}), p]);

			const MSG2 = Buffer.allocUnsafe(65535*2);;
			p = h2.sendMessage(Buffer.from(MSG2), pub1[0], pub1[1]);
			await Promise.all([new Promise(res => {
				h1.once('message', recvd => {
					t.equal(Buffer.compare(recvd, MSG2), 0);
					res();
				});
			}), p]);
		}finally{
			h1.close();
			h2.close();
		}
	});
}
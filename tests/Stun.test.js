const discover = require('../lib/Stun');
const Socket = require('../');

module.exports = async function(test){
	await test('Stun throws on failure', async (t) => {
		const h = new Socket();
		await h.bind();
		let caught = false;
		try {
			await discover(h, {address: 'invalid.stun.addr'});
		}catch(err){
			caught = true;
		}finally{
			t.ok(caught);
			await h.close();
		}
	});
}
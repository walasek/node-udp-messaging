const lookup = require('../lib/Lookup');

module.exports = async function(test){
	await test('DNS Lookup for an invalid name throws', async (t) => {
		try {
			await lookup('invalid.domain.name');
		}catch(err){
			if(err.code == 'ENOTFOUND'){
				t.ok(true);
			}else{
				t.fail('Invalid error '+err);
			}
		}
	});
}
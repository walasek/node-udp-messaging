const glob = require('glob');
const path = require('path');
const test = require('zora');

async function runTestFile(file){
	await test('Testing file '+file, async (t) => {
		await require(path.resolve(file))(t.test);
	});
}

if(process.argv[2])
	return runTestFile(process.argv[2]);

async function _run(){
	glob.sync('./tests/**/*.test.js').forEach(async (file) => {
		await runTestFile(file);
	});
}
_run();
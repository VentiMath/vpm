import process from 'node:process';
import test from 'ava';
import envPaths from './index.js';

test('default', t => {
	const name = 'unicorn';
	const paths = envPaths(name);

	for (const [key, value] of Object.entries(paths)) {
		console.log(`  ${key}: ${value}`);
		t.true(value.endsWith(`${name}-nodejs`));
	}
});

test('custom suffix', t => {
	const name = 'unicorn';
	const options = {suffix: 'horn'};
	const paths = envPaths(name, options);
	t.true(paths.data.endsWith(`${name}-${options.suffix}`));
});

test('no suffix', t => {
	const name = 'unicorn';
	const paths = envPaths(name, {suffix: ''});
	t.true(paths.data.endsWith(name));
});

test('rejects invalid name', t => {
	t.throws(() => envPaths('../../x'), {message: /Unsafe filename/});
	t.throws(() => envPaths('../foo/bar'), {message: /Unsafe filename/});
	t.throws(() => envPaths('foo/bar'), {message: /Unsafe filename/});
	t.throws(() => envPaths(''), {message: /Unsafe filename/});
});

test('rejects invalid suffix', t => {
	t.throws(() => envPaths('myapp', {suffix: '../x'}), {message: /Unsafe filename/});
	t.throws(() => envPaths('myapp', {suffix: 'foo/bar'}), {message: /Unsafe filename/});
});

// Linux-specific tests
if (process.platform === 'linux') {
	test('correct paths with XDG_*_HOME set', t => {
		const envVars = {
			data: 'XDG_DATA_HOME',
			config: 'XDG_CONFIG_HOME',
			cache: 'XDG_CACHE_HOME',
			log: 'XDG_STATE_HOME',
		};

		for (const env of Object.values(envVars)) {
			process.env[env] = `/tmp/${env}`;
		}

		const name = 'unicorn';
		const paths = envPaths(name);

		for (const env of Object.keys(envVars)) {
			const expectedPath = process.env[envVars[env]];
			t.true(paths[env].startsWith(expectedPath) && paths[env].endsWith(`${name}-nodejs`));
		}
	});
}

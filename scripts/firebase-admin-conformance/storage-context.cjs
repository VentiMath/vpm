'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    for (const variant of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 60000});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        process.stdout.write(run.stdout);
    }
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const root = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const admin = require(path.join(root, 'lib/app/index.js'));
    const {getStorage, getDownloadURL, Storage} = require(path.join(root, 'lib/storage/index.js'));
    const library = require(require.resolve(original ? '@google-cloud/storage' : 'vgoogle-cloud-storage', {paths: [root]}));
    const certificate = require('./upstream/test/resources/mock.key.json');
    const envNames = ['STORAGE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY',
        'http_proxy', 'https_proxy', 'all_proxy'];
    const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
    for (const name of envNames) delete process.env[name];
    const http = require('node:http'), crypto = require('node:crypto'), servers = [], requests = [], apps = [];
    const start = async label => {
        const server = http.createServer(async (request, response) => {
            const chunks = [];for await (const chunk of request) chunks.push(chunk);
            requests.push({label, method: request.method, path: request.url, body: Buffer.concat(chunks).toString()});
            response.writeHead(200, {'content-type': 'application/json'});
            response.end(JSON.stringify({name: 'item', bucket: 'fixture', size: '7', generation: '1', downloadTokens: 'fixture-token', endpoint: label}));
        });
        servers.push(server);await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        return `http://127.0.0.1:${server.address().port}`;
    };
    const makeApp = name => {
        const app = admin.initializeApp({projectId: 'fixture-project', storageBucket: 'fixture', credential: admin.cert(certificate)}, name);
        apps.push(app);return app;
    };
    try {
        const a = await start('A'), b = await start('B');
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = a.slice(7);
        const appA = makeApp('first'), serviceA = getStorage(appA), fileA = serviceA.bucket().file('item');
        assert.equal(process.env.STORAGE_EMULATOR_HOST, original ? a : undefined);
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = b.slice(7);
        const appB = makeApp('second'), fileB = getStorage(appB).bucket().file('item');
        assert.equal((await fileA.getMetadata())[0].endpoint, 'A');
        assert.equal((await fileB.getMetadata())[0].endpoint, original ? 'A' : 'B');
        await fileB.save('fixture', {resumable: false, validation: false});
        assert.equal(requests.at(-1).label, original ? 'A' : 'B');
        assert.match(requests.at(-1).path, /^\/upload\/storage\/v1\/b\/fixture\/o/);
        assert.ok(requests.at(-1).body.includes('fixture'));
        assert.equal(new URL(await getDownloadURL(fileB)).origin, original ? a : b);
        for (const version of ['v2', 'v4']) {
            const [signed] = await fileB.getSignedUrl({action: 'read', version, expires: Date.now() + 60000});
            assert.equal(new URL(signed).origin, original ? a : b);
        }

        // An ambient change must not redirect a previously created client's
        // Firebase metadata lookup or change its signed form's bucket route.
        process.env.STORAGE_EMULATOR_HOST = b;
        assert.equal(new URL(await getDownloadURL(fileA)).origin, original ? b : a);
        delete process.env.STORAGE_EMULATOR_HOST;
        const [policy] = await fileA.generateSignedPostPolicyV4({expires: Date.now() + 60000});
        assert.equal(policy.url, original ? a : `${a}/fixture`);
        assert.ok(crypto.verify('sha256', Buffer.from(policy.fields.policy), crypto.createPublicKey(certificate.private_key),
            Buffer.from(policy.fields['x-goog-signature'], 'hex')));

        // Explicit API endpoints must select the same server for metadata and
        // uploads even when an ambient emulator is configured.
        process.env.STORAGE_EMULATOR_HOST = a;
        const direct = new library.Storage({projectId: 'fixture-project', apiEndpoint: b,
            credentials: {private_key: certificate.private_key, client_email: certificate.client_email}, retryOptions: {autoRetry: false}});
        const explicit = direct.bucket('fixture').file('item');
        assert.equal((await explicit.getMetadata())[0].endpoint, original ? 'A' : 'B');
        assert.match(requests.at(-1).path, original ? /^\/b\/fixture\/o\/item/ : /^\/storage\/v1\/b\/fixture\/o\/item/);
        await explicit.save('fixture', {resumable: false, validation: false});
        assert.equal(requests.at(-1).label, 'B');
        const [explicitPolicy] = await explicit.generateSignedPostPolicyV4({expires: Date.now() + 60000});
        assert.equal(explicitPolicy.url, original ? `${b}/fixture` : b);

        delete process.env.STORAGE_EMULATOR_HOST; delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
        const normal = new library.Storage({projectId: 'fixture-project', apiEndpoint: 'https://STORAGE.GOOGLEAPIS.COM/'});
        assert.equal(normal.customEndpoint, original);
        if (!original) {
            for (const apiEndpoint of ['ftp://example.test', 'https://user:pass@example.test', 'https://example.test/?token=x', 'https://example.test/#fragment', 'https://example.test/?', 'https://example.test/#'])
                assert.throws(() => new library.Storage({apiEndpoint}), /HTTP\(S\)/);
            const scoped = new library.Storage({projectId: 'fixture-project', emulatorHost: a});
            assert.equal((await scoped.bucket('fixture').file('item').getMetadata())[0].endpoint, 'A');
            assert.equal(process.env.STORAGE_EMULATOR_HOST, undefined);
            assert.throws(() => new library.Storage({apiEndpoint: a, emulatorHost: b}), /either emulatorHost or apiEndpoint/);
        }

        const {ApplicationDefaultCredential, ServiceAccountCredential} = require(path.join(root, 'lib/app/credential-internal.js'));
        const adc = new Storage({options: {projectId: 'explicit-project', credential: new ApplicationDefaultCredential()}});
        assert.equal(adc.bucket('fixture').storage.projectId, original ? '{{projectId}}' : 'explicit-project');
        const first = new ServiceAccountCredential({...certificate, client_email: 'first@example.test'});
        const second = new ServiceAccountCredential({...certificate, client_email: 'second@example.test'});
        let reads = 0;
        const changing = new Storage({get options() {reads++;return {projectId: 'fixture-project', credential: reads === 1 ? first : second};}});
        assert.equal(reads, original ? 2 : 1);
        // Inspect the credentials selected during construction through the
        // actual bucket handle's underlying Storage client.
        assert.equal(changing.bucket('fixture').storage.authClient.jsonContent.client_email, original ? 'second@example.test' : 'first@example.test');

        await admin.deleteApp(appA);apps.splice(apps.indexOf(appA), 1);
        if (original) assert.equal(serviceA.bucket('fixture').name, 'fixture');
        else assert.throws(() => serviceA.bucket('fixture'), error => error.code === 'app/app-deleted');
        console.log(`${original ? 'Upstream' : 'VPM'} Storage context controls: two real servers, metadata/upload/download routing, V2/V4 URLs, verified V4 form signature, ADC project, option identity and deleted-app access checked.`);
    } finally {
        await Promise.all(apps.map(app => admin.deleteApp(app)));
        for (const server of servers) server.closeAllConnections();
        await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
        for (const name of envNames) if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
    }
})().catch(error => {console.error(error);process.exitCode = 1;});

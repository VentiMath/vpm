'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    for (const variant of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 30000});
        assert.equal(run.status, 0, run.stderr || run.stdout);
        process.stdout.write(run.stdout);
    }
} else (async () => {
    const original = process.argv.at(-1) === 'upstream';
    const directory = path.resolve(__dirname, original ? 'node_modules/firebase-admin' : '../../packages/vfirebase-admin');
    const {FirestoreService, getFirestoreOptions} = require(path.join(directory, 'lib/firestore/firestore-internal.js'));
    const {ServiceAccountCredential, ApplicationDefaultCredential} = require(path.join(directory, 'lib/app/credential-internal.js'));
    const {FirebaseApp} = require(path.join(directory, 'lib/app/firebase-app.js'));
    const certificate = require('./upstream/test/resources/mock.key.json');
    const first = new ServiceAccountCredential({...certificate, client_email: 'first@example.test'});
    const second = new ServiceAccountCredential({...certificate, client_email: 'second@example.test'});
    const app = new FirebaseApp({projectId: 'fixture-project', credential: first}, 'fixture');
    const close = [];
    try {
        const owner = new FirestoreService(app), settings = {preferRest: true};
        const initial = owner.initializeDatabase('owned', settings); close.push(initial);
        assert.equal(initial._settings.preferRest, true);
        settings.preferRest = false;
        if (original) assert.equal(owner.initializeDatabase('owned', {preferRest: false}), initial);
        else assert.throws(() => owner.initializeDatabase('owned', {preferRest: false}), error => error.code === 'firestore/failed-precondition');
        assert.equal(owner.getDatabase('owned'), initial);
        if (!original) assert.equal(owner.initializeDatabase('owned', {preferRest: true}), initial);
        const other = owner.getDatabase('other'); close.push(other);
        assert.notEqual(other, initial);
        assert.equal(other.databaseId, 'other');
        assert.equal(owner.getDatabase('other'), other);
        assert.equal(owner.app, app);

        let reads = 0;
        const changing = {get preferRest() {return ++reads === 1 ? false : true;}};
        const captured = owner.initializeDatabase('getter', changing); close.push(captured);
        assert.equal(captured._settings.preferRest, false);
        if (original) assert.throws(() => owner.initializeDatabase('getter', {preferRest: false}), /different options/);
        else assert.equal(owner.initializeDatabase('getter', {preferRest: false}), captured);
        assert.equal(reads, original ? 2 : 1);

        let optionReads = 0;
        const changingApp = {get options() {optionReads++; return {projectId: 'fixture-project', credential: optionReads === 1 ? first : second};}};
        const projected = getFirestoreOptions(changingApp, {preferRest: true});
        assert.equal(optionReads, original ? 2 : 1);
        assert.equal(projected.credentials.client_email, original ? 'second@example.test' : 'first@example.test');
        assert.equal(projected.projectId, 'fixture-project');
        assert.equal(projected.preferRest, true);
        const adc = new ApplicationDefaultCredential();
        assert.equal(getFirestoreOptions({options: {projectId: 'explicit-project', credential: adc}}).projectId, 'explicit-project');

        // A synchronous constructor failure must not publish a cache entry.
        const dependency = require(require.resolve(original ? '@google-cloud/firestore' : 'vgoogle-cloud-firestore', {paths: [directory]}));
        const Firestore = dependency.Firestore;
        let attempts = 0;
        dependency.Firestore = class {
            constructor(options) {
                if (++attempts === 1) throw Error('fixture initialization failure');
                this.options = options;
            }
        };
        try {
            const recovering = new FirestoreService(app);
            assert.throws(() => recovering.getDatabase('retry'), /fixture initialization failure/);
            const recovered = recovering.getDatabase('retry');
            assert.equal(recovered.options.databaseId, 'retry');
            assert.equal(recovering.getDatabase('retry'), recovered);
            assert.equal(attempts, 2);
        } finally {dependency.Firestore = Firestore;}
    } finally {await Promise.all(close.map(client => client.terminate()));await app.delete();}
    console.log(`${original ? 'Upstream' : 'VPM'} Firestore facade controls: setting mutation, single getter reads, credential/project identity, distinct databases and constructor recovery verified.`);
})().catch(error => {console.error(error);process.exitCode = 1;});

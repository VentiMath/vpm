'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (!process.argv.includes('--child')) {
    for (const variant of ['upstream', 'vpm']) {
        const result = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 30000});
        assert.equal(result.status, 0, result.stderr || result.stdout);
        process.stdout.write(result.stdout);
    }
} else {
    const original = process.argv.at(-1) === 'upstream';
    const directory = path.resolve(__dirname, original ? 'node_modules/google-gax' : '../../packages/vgoogle-gax');
    const {GrpcClient} = require(directory);
    const Fallback = require(path.join(directory, 'build/src/fallback.js')).GrpcClient;
    const schema = name => ({nested: {[name]: {fields: {value: {type: 'string', id: 1}}}}});
    const client = new GrpcClient({auth: {}});
    const fallback = new Fallback({auth: {}});

    for (const [label, owner, load, names] of [
        ['grpc', GrpcClient, (json, refresh) => client.loadProtoJSON(json, refresh), result => Object.keys(result)],
        ['fallback', Fallback, (json, refresh) => fallback.loadProtoJSON(json, refresh), result => Object.keys(result.nested)],
    ]) {
        owner.clearProtoCache();
        const descriptor = schema('First');
        const initial = load(descriptor);
        assert.equal(load(JSON.parse(JSON.stringify(descriptor))), initial);
        descriptor.nested.Second = schema('Second').nested.Second;
        assert.notEqual(load(descriptor), initial);
        const refreshed = load(descriptor, true);
        assert.equal(load(descriptor), refreshed, 'refresh also replaces the cached result');
        owner.clearProtoCache();
        assert.notEqual(load(descriptor), refreshed);

        owner.clearProtoCache();
        let reads = 0;
        const changing = {get nested() { return schema(++reads === 1 ? 'First' : 'Second').nested; }};
        const compiled = load(changing);
        assert.deepEqual(names(compiled), [original ? 'Second' : 'First']);
        assert.equal(load(schema('First')), compiled);
        if (!original) assert.equal(reads, 1, 'descriptor is observed once');

        owner.clearProtoCache();
        const input = schema('First');
        input.nested.First.options = {deprecated: false};
        const beforeMutation = load(input);
        input.nested.First.options.deprecated = true;
        if (!original && label === 'fallback') assert.equal(beforeMutation.lookupType('First').options.deprecated, false);
        assert.notEqual(load(input), beforeMutation);
        owner.clearProtoCache();
        console.log(`${label}: content identity, refresh, clearing, mutation and snapshot controls pass (${original ? 'upstream' : 'vpm'}).`);
    }

    GrpcClient.clearProtoCache();
    const compiler = tag => ({loadPackageDefinition: () => ({tag})});
    const first = new GrpcClient({auth: {}, grpc: compiler('first')});
    const second = new GrpcClient({auth: {}, grpc: compiler('second')});
    assert.equal(first.loadProtoJSON(schema('First')).tag, 'first');
    assert.equal(second.loadProtoJSON(schema('First')).tag, original ? 'first' : 'second');
    GrpcClient.clearProtoCache();
    let attempts = 0;
    const retry = new GrpcClient({auth: {}, grpc: {loadPackageDefinition() {
        if (++attempts === 1) throw new Error('compile failed');
        return {tag: 'recovered'};
    }}});
    assert.throws(() => retry.loadProtoJSON(schema('First')), /compile failed/);
    assert.equal(retry.loadProtoJSON(schema('First')).tag, 'recovered');
    assert.equal(retry.loadProtoJSON(schema('First')).tag, 'recovered');
    assert.equal(attempts, 2);
    console.log(`Compiler isolation and failure recovery controls pass (${original ? 'upstream' : 'vpm'}).`);
}

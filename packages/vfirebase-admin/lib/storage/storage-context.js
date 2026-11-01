'use strict';

const {FirebaseStorageError} = require('./error');
const {ServiceAccountCredential, isApplicationDefault} = require('../app/credential-internal');
const nonempty = value => typeof value === 'string' && value.length > 0;
const endpoints = new WeakMap();
const defaultDownloadEndpoint = 'https://firebasestorage.googleapis.com';

function storageOptions(app) {
    if (!app || typeof app !== 'object' || Array.isArray(app) || !('options' in app)) {
        throw new FirebaseStorageError({code: 'invalid-argument',
            message: 'First argument passed to admin.storage() must be a valid Firebase app instance.'});
    }
    const {credential, projectId: explicitProject} = app.options;
    const serviceAccount = credential instanceof ServiceAccountCredential;
    if (!serviceAccount && !isApplicationDefault(credential)) {
        throw new FirebaseStorageError({code: 'invalid-credential',
            message: 'Failed to initialize Google Cloud Storage client with the available credential. ' +
                'Must initialize the SDK with a certificate credential or application default credentials ' +
                'to use Cloud Storage API.'});
    }
    const projectId = nonempty(explicitProject) ? explicitProject : serviceAccount ? credential.projectId
        : process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const options = {};
    if (nonempty(projectId)) options.projectId = projectId;
    if (serviceAccount) options.credentials = {private_key: credential.privateKey, client_email: credential.clientEmail};
    const emulator = process.env.STORAGE_EMULATOR_HOST;
    const firebaseEmulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    if (emulator) options.emulatorHost = emulator;
    else if (firebaseEmulator) {
        if (/https?:\/\//i.test(firebaseEmulator)) throw new FirebaseStorageError({code: 'invalid-emulator-host',
            message: 'FIREBASE_STORAGE_EMULATOR_HOST should not contain a protocol (http or https).'});
        let valid = false;
        try {
            const url = new URL('http://' + firebaseEmulator);
            valid = !!url.hostname && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash;
        } catch {}
        if (!valid) throw new FirebaseStorageError({code: 'invalid-emulator-host',
            message: 'FIREBASE_STORAGE_EMULATOR_HOST must be a host and optional port, without a path, credentials, query or fragment.'});
        options.emulatorHost = 'http://' + firebaseEmulator;
    }
    return options;
}
function rememberEndpoint(client) {endpoints.set(client, client.emulatorHost || defaultDownloadEndpoint);}
function downloadEndpoint(file) {
    return endpoints.get(file?.storage) || process.env.STORAGE_EMULATOR_HOST || defaultDownloadEndpoint;
}

exports.storageOptions = storageOptions;
exports.rememberEndpoint = rememberEndpoint;
exports.downloadEndpoint = downloadEndpoint;

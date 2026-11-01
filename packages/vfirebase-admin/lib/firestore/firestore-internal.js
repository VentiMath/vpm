/*! firebase-admin v14.5.0 */
"use strict";
/*!
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const {FirebaseFirestoreError} = require('./error');
const {ServiceAccountCredential, isApplicationDefault} = require('../app/credential-internal');
const {getSdkVersion} = require('../utils');
const nonempty = value => typeof value === 'string' && value.length > 0;
const DEFAULT_DATABASE_ID = '(default)';

function getFirestoreOptions(app, settings) {
    if (!app || typeof app !== 'object' || Array.isArray(app) || !('options' in app)) {
        throw new FirebaseFirestoreError({code: 'invalid-argument',
            message: 'First argument passed to admin.firestore() must be a valid Firebase app instance.'});
    }
    // Credential and project come from the same app-options snapshot.
    const options = app.options;
    const {credential, projectId: explicitProject} = options;
    const serviceAccount = credential instanceof ServiceAccountCredential;
    const projectId = nonempty(explicitProject) ? explicitProject : serviceAccount ? credential.projectId
        : process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    if (!serviceAccount && !isApplicationDefault(credential)) {
        throw new FirebaseFirestoreError({code: 'invalid-credential',
            message: 'Failed to initialize Google Cloud Firestore client with the available credentials. ' +
                'Must initialize the SDK with a certificate credential or application default credentials ' +
                'to use Cloud Firestore API.'});
    }
    const version = getSdkVersion();
    const result = {firebaseVersion: version, firebaseAdminVersion: version, preferRest: settings?.preferRest};
    if (serviceAccount) result.credentials = {private_key: credential.privateKey, client_email: credential.clientEmail};
    if (nonempty(projectId)) result.projectId = projectId;
    return result;
}

class FirestoreService {
    #app;
    #databases = new Map();
    constructor(app) {this.#app = app;}
    get app() {return this.#app;}
    getDatabase(id) {
        return this.#databases.get(id)?.client ?? this.initializeDatabase(id, {});
    }
    initializeDatabase(id, settings) {
        const preferRest = settings?.preferRest;
        const existing = this.#databases.get(id);
        if (existing) {
            if (existing.preferRest === preferRest) return existing.client;
            throw new FirebaseFirestoreError({code: 'failed-precondition',
                message: 'initializeFirestore() has already been called with ' +
                    'different options. To avoid this error, call initializeFirestore() with the ' +
                    'same options as when it was originally called, or call getFirestore() to return the' +
                    ' already initialized instance.'});
        }
        const options = getFirestoreOptions(this.#app, {preferRest});
        options.databaseId = id;
        let Firestore;
        try {({Firestore} = require('vgoogle-cloud-firestore'));}
        catch (cause) {
            throw new FirebaseFirestoreError({code: 'missing-dependencies',
                message: 'Failed to import the Cloud Firestore client library for Node.js. ' +
                    'Make sure the "vgoogle-cloud-firestore" package is installed.', cause});
        }
        const client = new Firestore(options);
        // Only publish successful construction and the actual option value used.
        this.#databases.set(id, {client, preferRest});
        return client;
    }
}

exports.DEFAULT_DATABASE_ID = DEFAULT_DATABASE_ID;
exports.getFirestoreOptions = getFirestoreOptions;
exports.FirestoreService = FirestoreService;

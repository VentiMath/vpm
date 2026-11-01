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
const {FirebaseStorageError} = require('./error');
const {storageOptions, rememberEndpoint} = require('./storage-context');
const invalidBucket = () => new FirebaseStorageError({code: 'invalid-argument',
    message: 'Bucket name not specified or invalid. Specify a valid bucket name via the ' +
        'storageBucket option when initializing the app, or specify the bucket name ' +
        'explicitly when calling the getBucket() method.'});
const nonempty = value => typeof value === 'string' && value.length > 0;

class Storage {
    #app;
    #client;
    constructor(app) {
        const options = storageOptions(app);
        let Client;
        try {({Storage: Client} = require('vgoogle-cloud-storage'));}
        catch (cause) {
            throw new FirebaseStorageError({code: 'missing-dependencies',
                message: 'Failed to import the Cloud Storage client library for Node.js. ' +
                    'Make sure the "vgoogle-cloud-storage" package is installed. ' + `Original error: ${cause}`});
        }
        this.#client = new Client(options);
        this.#app = app;
        rememberEndpoint(this.#client);
    }
    get app() {return this.#app;}
    bucket(name) {
        if (name !== undefined && !nonempty(name)) throw invalidBucket();
        // Reading name checks the real app's lifetime without copying options
        // when the caller already supplied the bucket name.
        this.#app.name;
        const selected = name === undefined ? this.#app.options.storageBucket : name;
        if (!nonempty(selected)) throw invalidBucket();
        return this.#client.bucket(selected);
    }
}
exports.Storage = Storage;

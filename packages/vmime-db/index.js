'use strict';

// Data: mime-db 1.54.0, Copyright (c) 2014 Jonathan Ong and
// Copyright (c) 2015-2022 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.
const database = require('./db.json');
Object.setPrototypeOf(database, null);
for (const record of Object.values(database)) {
  Object.setPrototypeOf(record, null);
  if (record.extensions) Object.freeze(record.extensions);
  Object.freeze(record);
}
module.exports = Object.freeze(database);

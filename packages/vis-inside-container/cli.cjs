#!/usr/bin/env node
'use strict';
process.exitCode = require('./index.cjs')() ? 0 : 2;

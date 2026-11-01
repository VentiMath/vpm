'use strict';
const fs = require('node:fs/promises');
// Chrome creates this file before finishing its two-line write.
module.exports = async function chromePort(file, timeout = 10000) {
  const deadline = Date.now() + timeout;
  do {
    try {
      const [port, endpoint] = (await fs.readFile(file, 'utf8')).trim().split(/\r?\n/);
      if (/^[1-9]\d*$/.test(port) && Number(port) <= 65535 && endpoint?.startsWith('/devtools/browser/')) return Number(port);
    } catch (error) {if (error.code !== 'ENOENT') throw error;}
    await new Promise(resolve => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  throw new Error('Chrome debugging port did not become ready');
};

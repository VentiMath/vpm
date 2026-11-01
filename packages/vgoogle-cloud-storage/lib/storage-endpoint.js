'use strict';

// Endpoint selection is per client. Metadata and upload routes must agree on
// the chosen host, even when a different emulator is configured later.
function normalizeEndpoint(value) {
    if (typeof value !== 'string' || !value) throw TypeError('Storage endpoint must be a nonempty string');
    const address = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(address);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || address.includes('?') || address.includes('#')) {
        throw TypeError('Storage endpoint must be an HTTP(S) URL without credentials, query or fragment');
    }
    return parsed.href.replace(/\/+$/, '');
}

function storageEndpoint(options, environmentHost, universe) {
    const {apiEndpoint, emulatorHost} = options;
    const standard = `https://storage.${universe}`;
    if (emulatorHost !== undefined && apiEndpoint) throw TypeError('Specify either emulatorHost or apiEndpoint, not both');
    // An explicit API endpoint overrides ambient emulator configuration. The
    // old split selected that endpoint for uploads but the emulator for metadata.
    const emulator = emulatorHost !== undefined ? emulatorHost : apiEndpoint ? undefined : environmentHost;
    if (emulator !== undefined) {
        const endpoint = normalizeEndpoint(emulator);
        return {apiEndpoint: endpoint, baseUrl: endpoint, customEndpoint: true, emulatorHost: endpoint};
    }
    const endpoint = apiEndpoint ? normalizeEndpoint(apiEndpoint) : standard;
    return {apiEndpoint: endpoint, baseUrl: `${endpoint}/storage/v1`, customEndpoint: endpoint !== standard, emulatorHost: undefined};
}

exports.normalizeEndpoint = normalizeEndpoint;
exports.storageEndpoint = storageEndpoint;

'use strict';
// vfirebase-functions: loads a module on first property access. Upstream's
// index modules require every provider (and each provider its Firebase Admin
// service) at import, so importing `firebase-functions/v2` for its logger also
// loaded Firestore, Auth and the Realtime Database client.
exports.lazy = load => {
	let module;
	const get = () => module ??= load();
	return new Proxy({}, {
		get: (_, key) => get()[key],
		has: (_, key) => key in get(),
		ownKeys: () => Reflect.ownKeys(get()),
		getOwnPropertyDescriptor: (_, key) => {
			const descriptor = Reflect.getOwnPropertyDescriptor(get(), key);
			return descriptor && { ...descriptor, configurable: true };
		},
	});
};

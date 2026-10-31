// vfirebase-functions: loads a Firebase Admin service on first use. Upstream
// imports each service statically, so importing a provider loaded Firestore,
// Auth and the Realtime Database client. Admin's ES module entries wrap its
// CommonJS modules, so both builds share one app registry.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export const lazy = (specifier) => {
	let module;
	const get = () => module ??= require(specifier);
	return new Proxy({}, { get: (_, key) => get()[key], has: (_, key) => key in get() });
};

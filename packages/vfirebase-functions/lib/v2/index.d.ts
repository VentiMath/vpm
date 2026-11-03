/** Firebase Functions application runtime. */
import * as https from "./providers/https";
import * as scheduler from "./providers/scheduler";
import * as tasks from "./providers/tasks";
import * as firestore from "./providers/firestore";
export {https,tasks,scheduler,firestore};
export { logger } from "../logger";
export { setGlobalOptions, requiresRole } from "./options";
export { requiresAPI } from "../common/api";
export type { GlobalOptions, SupportedRegion, MemoryOption, VpcEgressSetting, IngressSetting, EventHandlerOptions, Role, } from "./options";
export { onInit } from "./core";
export type { CloudFunction, CloudEvent, ParamsOf } from "./core";
export { Change } from "../common/change";
export { traceContext } from "../common/trace";
import * as params from "../params";
export { params };
import { setApp as setEmulatedAdminApp } from "../common/app";
export declare const app: {
    setEmulatedAdminApp: typeof setEmulatedAdminApp;
};

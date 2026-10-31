'use strict';
// Generates vgoogle-cloud-firestore-api's client declarations from the method
// tables in lib/services.js and the message types in protos/protos.json, so
// types cannot drift from the runtime. `--check` verifies the committed file.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../packages/vgoogle-cloud-firestore-api');
const services = require(path.join(root, 'lib/services.js'));
const json = require(path.join(root, 'protos/protos.json'));

function lookup(name) {
  let node = json;
  for (const part of name.split('.')) node = node?.nested?.[part];
  assert.ok(node, 'unknown proto ' + name);
  return node;
}
// A proto name as an interface or class reference in protos.d.ts.
function type(name, kind = 'interface') {
  const parts = name.replace(/^\./, '').split('.');
  const last = parts.pop();
  return 'protos.' + parts.join('.') + '.' + (kind === 'interface' ? 'I' + last : last);
}
function qualify(pkg, name) {
  return name.includes('.') ? name : pkg + '.' + name;
}

function methodTypes(spec, method) {
  const pkg = spec.service.split('.').slice(0, -1).join('.');
  const rpc = lookup(spec.service).methods[method.name[0].toUpperCase() + method.name.slice(1)];
  assert.ok(rpc, spec.service + ' has no ' + method.name);
  const request = qualify(pkg, rpc.requestType), response = qualify(pkg, rpc.responseType);
  const types = {request: type(request), response: type(response)};
  if (method.kind === 'paged') {
    const field = lookup(response).fields[method.resources];
    assert.equal(field.rule, 'repeated', method.name + ' resources');
    types.resource = field.type === 'string' ? 'string' : type(qualify(pkg, field.type));
  }
  return types;
}

function declare(spec) {
  const lines = [];
  const add = (...items) => lines.push(...items.map(line => '  ' + line));
  const tail = (t, nullable = '| undefined') => `${t} ${nullable}`;
  lines.push(`export declare class ${spec.className} {`);
  add('auth: gax.GoogleAuth;', 'descriptors: Descriptors;', 'warn: (code: string, message: string, warnType?: string) => void;',
    'innerApiCalls: {[name: string]: Function};', 'locationsClient: LocationsClient;',
    `${spec.stubProperty}?: Promise<{[method: string]: Function}>;`);
  if (spec.pathTemplates) add('pathTemplates: {[name: string]: gax.PathTemplate};');
  if (spec.longRunning) add('operationsClient: gax.OperationsClient;');
  add('/** Builds a client. Without `gaxInstance`, vgoogle-gax is used. */',
    'constructor(opts?: ClientOptions, gaxInstance?: typeof gax | typeof gax.fallback);',
    `initialize(): Promise<{[method: string]: Function}>;`,
    'static get servicePath(): string;', 'static get apiEndpoint(): string;', 'get apiEndpoint(): string;',
    'get universeDomain(): string;', 'static get port(): number;', 'static get scopes(): string[];',
    'getProjectId(): Promise<string>;', 'getProjectId(callback: Callback<string, undefined, undefined>): void;');
  for (const method of spec.methods) {
    const {name, kind} = method;
    const {request, response, resource} = methodTypes(spec, method);
    const plain = (t, r) => `Callback<${t}, ${r} | null | undefined, {} | null | undefined>`;
    if (kind === 'unary') {
      add(`${name}(request?: ${request}, options?: CallOptions): Promise<[${response}, ${tail(request)}, {} | undefined]>;`,
        `${name}(request: ${request}, options: CallOptions, callback: ${plain(response, request)}): void;`,
        `${name}(request: ${request}, callback: ${plain(response, request)}): void;`);
    } else if (kind === 'lro') {
      const operation = `LROperation<${type(method.response)}, ${type(method.metadata)}>`;
      add(`${name}(request?: ${request}, options?: CallOptions): Promise<[${operation}, ${tail('protos.google.longrunning.IOperation')}, {} | undefined]>;`,
        `${name}(request: ${request}, options: CallOptions, callback: ${plain(operation, 'protos.google.longrunning.IOperation')}): void;`,
        `${name}(request: ${request}, callback: ${plain(operation, 'protos.google.longrunning.IOperation')}): void;`,
        `check${name[0].toUpperCase() + name.slice(1)}Progress(name: string): Promise<LROperation<${type(method.response, 'class')}, ${type(method.metadata, 'class')}>>;`);
    } else if (kind === 'paged') {
      const callback = `PaginationCallback<${request}, ${response} | null | undefined, ${resource}>`;
      add(`${name}(request?: ${request}, options?: CallOptions): Promise<[${resource}[], ${request} | null, ${response}]>;`,
        `${name}(request: ${request}, options: CallOptions, callback: ${callback}): void;`,
        `${name}(request: ${request}, callback: ${callback}): void;`,
        `${name}Stream(request?: ${request}, options?: CallOptions): ReturnType<gax.PageDescriptor['createStream']>;`,
        `${name}Async(request?: ${request}, options?: CallOptions): AsyncIterable<${resource}>;`);
    } else if (kind === 'server') {
      add(`${name}(request?: ${request}, options?: CallOptions): gax.CancellableStream;`);
    } else if (kind === 'bidi') {
      add(`${name}(options?: CallOptions): gax.CancellableStream;`);
    }
  }
  const location = 'LocationProtos.google.cloud.location';
  add(`getLocation(request: ${location}.IGetLocationRequest, options?: gax.CallOptions | Callback<${location}.ILocation, ${location}.IGetLocationRequest | null | undefined, {} | null | undefined>, callback?: Callback<${location}.ILocation, ${location}.IGetLocationRequest | null | undefined, {} | null | undefined>): Promise<${location}.ILocation>;`,
    `listLocationsAsync(request: ${location}.IListLocationsRequest, options?: CallOptions): AsyncIterable<${location}.ILocation>;`);
  if (spec.longRunning) {
    const op = 'protos.google.longrunning';
    add(`getOperation(request?: ${op}.IGetOperationRequest, optionsOrCallback?: gax.CallOptions | Callback<${op}.Operation, ${op}.IGetOperationRequest, {} | null | undefined>, callback?: Callback<${op}.Operation, ${op}.IGetOperationRequest, {} | null | undefined>): Promise<[${op}.Operation]>;`,
      `listOperationsAsync(request?: ${op}.IListOperationsRequest, options?: gax.CallOptions): AsyncIterable<${op}.IOperation>;`,
      `cancelOperation(request?: ${op}.ICancelOperationRequest, optionsOrCallback?: gax.CallOptions | Callback<${op}.ICancelOperationRequest, protos.google.protobuf.Empty, {} | undefined | null>, callback?: Callback<${op}.ICancelOperationRequest, protos.google.protobuf.Empty, {} | undefined | null>): Promise<protos.google.protobuf.Empty>;`,
      `deleteOperation(request?: ${op}.IDeleteOperationRequest, optionsOrCallback?: gax.CallOptions | Callback<protos.google.protobuf.Empty, ${op}.IDeleteOperationRequest, {} | null | undefined>, callback?: Callback<protos.google.protobuf.Empty, ${op}.IDeleteOperationRequest, {} | null | undefined>): Promise<protos.google.protobuf.Empty>;`);
  }
  for (const [name, , params] of spec.pathTemplates ?? []) {
    add(`${name}Path(${params.map(p => p + ': string').join(', ')}): string;`);
    for (const param of params) add(`match${param[0].toUpperCase() + param.slice(1)}From${name[0].toUpperCase() + name.slice(1)}Name(${name}Name: string): string | number;`);
  }
  add('/** Closes the channel; later calls fail with "The client has already been closed." */', 'close(): Promise<void>;');
  lines.push('}');
  return lines.join('\n');
}

const output = `// Generated by scripts/build-firestore-api.cjs from lib/services.js and
// protos/protos.json. Do not edit by hand.
import type * as gax from 'vgoogle-gax';
import type {Callback, CallOptions, Descriptors, ClientOptions, LROperation, PaginationCallback, LocationsClient, LocationProtos} from 'vgoogle-gax';
import type * as protos from '../protos/protos';

${declare(services.firestore)}

${declare(services.admin)}
`;
const target = path.join(root, 'v1/index.d.ts');
if (process.argv.includes('--check')) {
  assert.equal(fs.readFileSync(target, 'utf8'), output, 'v1/index.d.ts is stale; run node scripts/build-firestore-api.cjs');
  console.log('Firestore API declarations are current.');
} else {
  fs.writeFileSync(target, output);
  console.log('Wrote ' + path.relative(process.cwd(), target));
}

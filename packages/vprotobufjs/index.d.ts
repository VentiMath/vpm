/** Independent application runtime: generated messages, reflection, schema loading and RPC wrappers. */
export as namespace protobuf;
import LongValue from "vlong";
export type Long = LongValue;
export type Properties<T> = { [P in keyof T]?: T[P] };
export type Constructor<T> = { new (...args: any[]): T; prototype: T };
export interface IConversionOptions {
  longs?: StringConstructor | NumberConstructor;
  enums?: StringConstructor;
  bytes?:
    | StringConstructor
    | ArrayConstructor
    | { from(...args: any[]): Uint8Array };
  defaults?: boolean;
  arrays?: boolean;
  objects?: boolean;
  oneofs?: boolean;
  json?: boolean;
}
export interface IParseOptions {
  keepCase?: boolean;
  alternateCommentMode?: boolean;
  preferTrailingComment?: boolean;
}
export interface IToJSONOptions {
  keepComments?: boolean;
}
export interface INamespace {
  options?: Record<string, any>;
  edition?: string;
  nested?: Record<string, AnyNestedObject>;
}
export interface IField {
  type: string;
  id: number;
  rule?: string;
  options?: Record<string, any>;
  extend?: string;
  jsonName?: string;
  protoName?: string;
}
export interface IMapField extends IField {
  keyType: string;
}
export interface IOneOf {
  oneof: string[];
  options?: Record<string, any>;
}
export interface IEnum {
  values: Record<string, number>;
  options?: Record<string, any>;
  edition?: string;
  reserved?: (string | number[])[];
}
export interface IType extends INamespace {
  fields: Record<string, IField | IMapField>;
  oneofs?: Record<string, IOneOf>;
  group?: boolean;
  extensions?: number[][];
  reserved?: (string | number[])[];
}
export interface IMethod {
  requestType: string;
  responseType: string;
  type?: string;
  requestStream?: boolean;
  responseStream?: boolean;
  options?: Record<string, any>;
  parsedOptions?: Record<string, any>[];
}
export interface IService extends INamespace {
  methods: Record<string, IMethod>;
}
export type AnyNestedObject =
  | INamespace
  | IType
  | IEnum
  | IService
  | IField
  | IMapField;
export class ReflectionObject {
  constructor(name: string, options?: Record<string, any>);
  name: string;
  parent: Namespace | null;
  readonly root: Root;
  readonly fullName: string;
  options?: Record<string, any>;
  edition?: string;
  resolved: boolean;
  filename: string | null;
  comment: string | null;
  getOption(name: string): any;
  setOption(name: string, value: any, ifNotSet?: boolean): this;
  setOptions(options: Record<string, any>, ifNotSet?: boolean): this;
  resolve(): this;
  toJSON(options?: IToJSONOptions): any;
}
export class Namespace extends ReflectionObject {
  constructor(name: string, options?: Record<string, any>);
  nested: Record<string, ReflectionObject>;
  readonly nestedArray: ReflectionObject[];
  get(name: string): ReflectionObject | null;
  add(object: ReflectionObject): this;
  remove(object: ReflectionObject): this;
  define(path: string, json?: Record<string, AnyNestedObject>): Namespace;
  addJSON(json: Record<string, AnyNestedObject>): this;
  lookup(
    path: string | string[],
    types?: Constructor<ReflectionObject>[],
    parentChecked?: boolean,
  ): ReflectionObject | null;
  lookupType(path: string): Type;
  lookupEnum(path: string): Enum;
  lookupService(path: string): Service;
  lookupTypeOrEnum(path: string): Type | Enum;
  resolveAll(): this;
}
export type LoadCallback = (error: Error | null, root?: Root) => void;
export class Root extends Namespace {
  constructor(options?: Record<string, any>);
  static fromJSON(json: INamespace, root?: Root): Root;
  files: string[];
  resolvePath(origin: string, target: string): string;
  load(files: string | string[], options?: IParseOptions): Promise<Root>;
  load(files: string | string[], callback: LoadCallback): void;
  load(
    files: string | string[],
    options: IParseOptions,
    callback: LoadCallback,
  ): void;
  loadSync(files: string | string[], options?: IParseOptions): Root;
}
export class Enum extends ReflectionObject {
  constructor(
    name: string,
    values?: Record<string, number>,
    options?: Record<string, any>,
  );
  static fromJSON(name: string, json: IEnum): Enum;
  values: Record<string, number>;
  readonly valuesById: Record<number, string>;
  reserved?: (string | number[])[];
  add(name: string, id: number, comment?: string): this;
  remove(name: string): this;
}
export class Field extends ReflectionObject {
  constructor(
    name: string,
    id: number,
    type: string,
    rule?: string,
    extend?: string,
    options?: Record<string, any>,
  );
  static fromJSON(name: string, json: IField | IMapField): Field;
  id: number;
  type: string;
  rule?: string;
  extend?: string;
  map: boolean;
  repeated: boolean;
  required: boolean;
  optional: boolean;
  long: boolean;
  bytes: boolean;
  partOf: OneOf | null;
  resolvedType: Type | Enum | null;
  defaultValue: any;
  typeDefault: any;
  jsonName?: string;
  protoName?: string;
  readonly packed: boolean;
}
export class MapField extends Field {
  constructor(
    name: string,
    id: number,
    keyType: string,
    type: string,
    options?: Record<string, any>,
  );
  keyType: string;
}
export class OneOf extends ReflectionObject {
  constructor(name: string, fields?: string[], options?: Record<string, any>);
  static fromJSON(name: string, json: IOneOf): OneOf;
  oneof: string[];
  fieldsArray: Field[];
  add(field: Field): this;
}
export class Message<T extends object = object> {
  constructor(properties?: Properties<T>);
  readonly $type: Type;
  toJSON(): Record<string, any>;
}
export type ReflectedMessage = Message<Record<string, any>> &
  Record<string, any>;
export class Type extends Namespace {
  constructor(name: string, options?: Record<string, any>);
  static fromJSON(name: string, json: IType): Type;
  fields: Record<string, Field>;
  oneofs: Record<string, OneOf>;
  readonly fieldsArray: Field[];
  readonly fieldsById: Record<number, Field>;
  readonly oneofsArray: OneOf[];
  ctor: Constructor<ReflectedMessage>;
  create(properties?: Record<string, any>): ReflectedMessage;
  setup(): this;
  encode(message: Record<string, any>, writer?: Writer): Writer;
  encodeDelimited(message: Record<string, any>, writer?: Writer): Writer;
  decode(reader: Reader | Uint8Array, length?: number): ReflectedMessage;
  decodeDelimited(reader: Reader | Uint8Array): ReflectedMessage;
  fromObject(object: Record<string, any>): ReflectedMessage;
  toObject(
    message: Message<any> | Record<string, any>,
    options?: IConversionOptions,
  ): Record<string, any>;
  verify(message: Record<string, any>): string | null;
  getTypeUrl(prefix?: string): string;
}
export class Method extends ReflectionObject {
  constructor(
    name: string,
    type: string | undefined,
    requestType: string,
    responseType: string,
    requestStream?: boolean,
    responseStream?: boolean,
    options?: Record<string, any>,
  );
  static fromJSON(name: string, json: IMethod): Method;
  type: string;
  requestType: string;
  responseType: string;
  requestStream: boolean;
  responseStream: boolean;
  resolvedRequestType: Type;
  resolvedResponseType: Type;
  parsedOptions?: Record<string, any>[];
}
export class Service extends Namespace {
  constructor(name: string, options?: Record<string, any>);
  static fromJSON(name: string, json: IService): Service;
  methods: Record<string, Method>;
  readonly methodsArray: Method[];
  create(
    impl: RPCImpl,
    requestDelimited?: boolean,
    responseDelimited?: boolean,
  ): rpc.Service;
}
export class Reader {
  constructor(buffer: Uint8Array);
  static create(buffer: Uint8Array | number[]): Reader;
  static discardUnknown: boolean;
  static recursionLimit: number;
  buf: Uint8Array;
  pos: number;
  len: number;
  discardUnknown: boolean;
  uint32(): number;
  int32(): number;
  sint32(): number;
  uint64(): LongValue;
  int64(): LongValue;
  sint64(): LongValue;
  fixed32(): number;
  sfixed32(): number;
  fixed64(): LongValue;
  sfixed64(): LongValue;
  float(): number;
  double(): number;
  bool(): boolean;
  bytes(): Uint8Array;
  string(): string;
  stringVerify(): string;
  tag(): number;
  size(): number;
  raw(start: number, end: number): Uint8Array;
  skip(length?: number): this;
  skipType(wireType: number, depth?: number, fieldNumber?: number): this;
  uint32s(target?: number[]): number[];
  int32s(target?: number[]): number[];
  sint32s(target?: number[]): number[];
  fixed32s(target?: number[]): number[];
  sfixed32s(target?: number[]): number[];
  floats(target?: number[]): number[];
  doubles(target?: number[]): number[];
  bools(target?: boolean[]): boolean[];
  uint64s(target?: LongValue[]): LongValue[];
  int64s(target?: LongValue[]): LongValue[];
  sint64s(target?: LongValue[]): LongValue[];
  fixed64s(target?: LongValue[]): LongValue[];
  sfixed64s(target?: LongValue[]): LongValue[];
}
export class BufferReader extends Reader {}
export type LongInput =
  | number
  | string
  | LongValue
  | { low: number; high: number; unsigned?: boolean };
export class Writer {
  static create(): Writer;
  static alloc(size: number): Uint8Array;
  buf: Uint8Array;
  pos: number;
  readonly len: number;
  uint32(value: number): this;
  int32(value: number): this;
  sint32(value: number): this;
  uint64(value: LongInput): this;
  int64(value: LongInput): this;
  sint64(value: LongInput): this;
  fixed32(value: number): this;
  sfixed32(value: number): this;
  fixed64(value: LongInput): this;
  sfixed64(value: LongInput): this;
  float(value: number): this;
  double(value: number): this;
  bool(value: boolean): this;
  bytes(value: Uint8Array | number[] | string): this;
  string(value: string): this;
  raw(value: Uint8Array): this;
  fork(): this;
  reset(): this;
  ldelim(): this;
  finish(shared?: boolean): Uint8Array;
  finishInto<T extends Uint8Array>(buffer: T, offset?: number): T;
  uint32s(value: number[]): this;
  int32s(value: number[]): this;
  sint32s(value: number[]): this;
  fixed32s(value: number[]): this;
  sfixed32s(value: number[]): this;
  floats(value: number[]): this;
  doubles(value: number[]): this;
  bools(value: boolean[]): this;
  uint64s(value: LongInput[]): this;
  int64s(value: LongInput[]): this;
  sint64s(value: LongInput[]): this;
  fixed64s(value: LongInput[]): this;
  sfixed64s(value: LongInput[]): this;
}
export class BufferWriter extends Writer {}
export type RPCImplCallback = (
  error: Error | null,
  response?: Uint8Array | Message<any> | null,
) => void;
export type RPCImpl = (
  method: Method | rpc.ServiceMethod<any, any> | null,
  requestData: Uint8Array | null,
  callback: RPCImplCallback | null,
) => any;
export namespace rpc {
  type ServiceMethod<TReq, TRes> = (
    request: TReq,
    callback: (error: Error | null, response?: TRes) => void,
  ) => void;
  class Service extends util.EventEmitter {
    constructor(
      impl: RPCImpl,
      requestDelimited?: boolean,
      responseDelimited?: boolean,
    );
    rpcImpl: RPCImpl | null;
    requestDelimited: boolean;
    responseDelimited: boolean;
    rpcCall(
      method: Method | ServiceMethod<any, any>,
      Request: any,
      Response: any,
      request: any,
      callback?: RPCImplCallback,
    ): any;
    end(fromRemote?: boolean): this;
  }
}
export namespace util {
  let Long: typeof LongValue | null;
  let Buffer: any;
  const isNode: boolean;
  const global: any;
  const Array: typeof Uint8Array;
  const emptyArray: readonly never[];
  const emptyObject: Readonly<Record<string, never>>;
  let recursionLimit: number;
  function isInteger(value: any): boolean;
  function isString(value: any): boolean;
  function isObject(value: any): boolean;
  function isSet(value: object, key: string): boolean;
  function isset(value: object, key: string): boolean;
  function newBuffer(value?: number | number[] | Uint8Array): Uint8Array;
  function makeProp(object: object, key: string, enumerable?: boolean): void;
  function merge<T extends object>(
    target: T,
    source: object,
    onlyMissing?: boolean,
  ): T;
  function oneOfGetter(names: string[]): () => string | undefined;
  function oneOfSetter(names: string[]): (name: string | undefined) => void;
  function longToHash(value: LongInput): string;
  function longFromHash(value: string, unsigned?: boolean): LongValue | number;
  function asPromise(fn: Function, context: any, ...args: any[]): Promise<any>;
  const toJSONOptions: IConversionOptions;
  const base64: {
    encode(bytes: Uint8Array, start: number, end: number): string;
    decode(text: string, bytes: Uint8Array, start: number): number;
    length(text: string): number;
    test(text: string): boolean;
  };
  const utf8: {
    length(text: string): number;
    write(text: string, bytes: Uint8Array, start: number): number;
    read(bytes: Uint8Array, start: number, end: number): string;
  };
  class ProtocolError extends Error {
    constructor(message: string, properties?: Record<string, any>);
    instance?: Message<any>;
  }
  class EventEmitter {
    on(name: string, listener: (...args: any[]) => void, context?: any): this;
    off(name?: string, listener?: (...args: any[]) => void): this;
    emit(name: string, ...args: any[]): this;
  }
  class LongBits {
    constructor(lo: number, hi: number);
    lo: number;
    hi: number;
    static readonly zero: LongBits;
    static from(value: LongInput): LongBits;
    static fromNumber(value: number): LongBits;
    static fromHash(value: string): LongBits;
    toLong(unsigned?: boolean): LongValue | number;
    toNumber(unsigned?: boolean): number;
    toHash(): string;
    zzEncode(): this;
    zzDecode(): this;
    length(): number;
  }
}
export interface ITokenizerHandle {
  next(): string | null;
  peek(): string | null;
  push(token: string): void;
  skip(token: string, optional?: boolean): boolean;
  readonly line: number;
  cmnt(): null;
}
export function tokenize(source: string): ITokenizerHandle;
export interface IParserResult {
  root: Root;
  package?: string;
  imports: string[];
  weakImports: string[];
  syntax: string;
  edition?: string;
}
export function parse(source: string, options?: IParseOptions): IParserResult;
export function parse(
  source: string,
  root: Root,
  options?: IParseOptions,
): IParserResult;
export function load(files: string | string[], root?: Root): Promise<Root>;
export function load(files: string | string[], callback: LoadCallback): void;
export function load(
  files: string | string[],
  root: Root,
  callback: LoadCallback,
): void;
export function loadSync(files: string | string[], root?: Root): Root;
export function common(name: string, json: Record<string, any>): void;
export const build: string;
export const roots: Record<string, any>;
export function configure(): void;
export namespace types {
  const basic: Record<string, number>;
  const long: Record<string, number>;
  const mapKey: Record<string, number>;
}

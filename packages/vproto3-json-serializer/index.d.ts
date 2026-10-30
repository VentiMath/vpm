import type {Message, Type} from 'vprotobufjs';
export type JSONValue = string | number | boolean | null | JSONValue[] | JSONObject;
export interface JSONObject { [key: string]: JSONValue; }
export interface ToProto3JSONOptions { numericEnums: boolean; }
/** Convert a reflected message to Proto3 JSON. Static messages need a reflected type. */
export function toProto3JSON(message: Message, options?: ToProto3JSONOptions): JSONValue;
/** Parse Proto3 JSON into a message belonging to the supplied reflected type. */
export function fromProto3JSON(type: Type, json: JSONValue): Message<{}> | null;

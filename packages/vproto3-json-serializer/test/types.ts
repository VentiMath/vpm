import {parse} from 'vprotobufjs';
import {fromProto3JSON, toProto3JSON, type JSONValue, type JSONObject, type ToProto3JSONOptions} from 'vproto3-json-serializer';
const type=parse('message Item{optional int64 id=1;}').root.lookupType('Item');
const options:ToProto3JSONOptions={numericEnums:true};
const object:JSONObject={id:'9007199254740993'};
const message=fromProto3JSON(type,object);
const value:JSONValue=message?toProto3JSON(message,options):null;
void value;

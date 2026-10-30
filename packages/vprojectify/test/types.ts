import {replaceProjectIdToken,MissingProjectIdError} from '../index.js';
const record={id:'{{projectId}}',nested:[{value:1}]};
const result:typeof record=replaceProjectIdToken(record,'project');
const literal:string=replaceProjectIdToken('{{projectId}}');
const error:Error=new MissingProjectIdError();void result;void literal;void error;
// @ts-expect-error project IDs are strings
replaceProjectIdToken(record,42);

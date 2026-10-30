import {Storage,File,CRC32C,type SaveOptions,type GetSignedUrlConfig} from 'vgoogle-cloud-storage';
import {createReadStream} from 'node:fs';
const storage = new Storage({projectId:'example',retryOptions:{autoRetry:false}});
const bucket=storage.bucket('example');const file:File=bucket.file('item');
const save:SaveOptions={contentType:'application/pdf',resumable:false,preconditionOpts:{ifGenerationMatch:0}};
file.save(new Uint8Array([1,2]),save);file.save(createReadStream('fixture'),save);
const config:GetSignedUrlConfig={action:'read',version:'v4',expires:Date.now()+3600000};file.getSignedUrl(config).then(([url])=>{const s:string=url;void s;});
file.exists().then(([exists])=>{const b:boolean=exists;void b;});file.delete({ignoreNotFound:true});
bucket.getFiles({prefix:'users/'}).then(([files])=>files.map(f=>f.name));
bucket.upload('file.pdf',{resumable:false});storage.createBucket('created',{location:'us-central1'});
file.download().then(([data])=>{const s:string=data.toString('utf8');void s;});file.createWriteStream().end('test');
CRC32C.from(new DataView(new ArrayBuffer(4)));
// @ts-expect-error action must be a supported operation
file.getSignedUrl({action:'toString',expires:Date.now()});
// @ts-expect-error incorrect save payload
file.save({hello:'world'});

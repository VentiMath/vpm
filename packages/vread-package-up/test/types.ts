import {readPackageUp, readPackageUpSync, PackageJsonError, type Options, type PackageJson, type JsonValue} from 'vread-package-up';
const options: Options = {cwd:new URL('file:///tmp'),normalize:false,stopAt:'/'};
const result=readPackageUpSync(options);
if(result){const data: PackageJson=result.packageJson;const value: JsonValue=data.type;if(typeof value==='string')value.toUpperCase();}
void readPackageUp({cwd:'.',normalize:false});
// @ts-expect-error the normalize: false opt-out is required
void readPackageUp({cwd:'.'});
// @ts-expect-error options are required
void readPackageUpSync();
const error=new PackageJsonError('/tmp/package.json','Invalid JSON');
const code: 'ERR_INVALID_PACKAGE_JSON'=error.code;void code;
// @ts-expect-error normalization is intentionally unsupported
readPackageUp({normalize:true});
// @ts-expect-error paths cannot be numbers
readPackageUpSync({cwd:4});
// @ts-expect-error raw metadata fields are not guaranteed strings
const version:string=result!.packageJson.version;
void version;

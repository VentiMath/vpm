import { PathScurry, PathBase, PathScurryWin32, ChildrenCache, ResolveCache, type FSOption, type WalkOptions } from '../index.cjs';
import * as fs from 'node:fs';
const overrides: FSOption = fs;
const s = new PathScurry('/tmp', { fs: overrides, nocase: false });
const paths: PathBase[] = s.walkSync();
const names: string[] = s.walkSync({ withFileTypes: false });
const promise: Promise<string[]> = s.walk('', { withFileTypes: false });
const link: string | undefined = s.readlinkSync();
const node: PathBase | undefined = s.readlinkSync('', { withFileTypes: true });
const opts: WalkOptions = { withFileTypes: Math.random() > 0.5, filter: p => p.isFile() };
const dynamic: (string | PathBase)[] = s.walkSync(opts);
const dirs: Promise<PathBase[]> = s.readdir();
const win = new PathScurryWin32('C:\\');
const cache = new ChildrenCache(100); cache.set(s.cwd, s.cwd.children());
new ResolveCache().set('a', 'b');
s.stream({ withFileTypes: false }).on('data', x => x.toUpperCase());
s.cwd.readdirCB((error, entries) => { if (!error) entries.map(x => x.fullpath()); });
// @ts-expect-error path rows are not strings
const wrong: string[] = s.walkSync();
// @ts-expect-error names are strings
s.walkSync({ withFileTypes: false })[0].fullpath();
void [paths,names,promise,link,node,dynamic,dirs,win,wrong];

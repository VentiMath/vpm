import semver, {Range, SemVer, satisfies, type ReleaseType} from "../index.mjs";
const parsed: SemVer | null=semver.parse("24.22.1");
const range=new Range("^24");
const result: boolean=satisfies(parsed||"24.0.0",range);
const kind: ReleaseType | null=semver.diff("8.1.0","8.2.0");
void [result,kind];

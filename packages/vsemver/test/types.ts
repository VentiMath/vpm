import semver = require("../index.cjs");
const version: semver.SemVer | null = semver.parse("7.8.6");
const range = new semver.Range("^7");
const matches: boolean = range.test(version || "7.8.6");
const coerce: string | undefined = semver.coerce("v24", {rtl: true})?.version;
const difference: semver.ReleaseType | null = semver.diff("1.0.0", "2.0.0");
const selected: string | null = semver.maxSatisfying(["1.0.0"] as const, range);
const numeric: number = semver.compareBuild("1.0.0+2", "1.0.0+3");
// @ts-expect-error unsupported release increment API
semver.inc("1.0.0", "major");
// @ts-expect-error version checks require a version
semver.satisfies(42, "^1");
void [matches,coerce,difference,selected,numeric];

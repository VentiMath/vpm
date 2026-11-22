import gensync from "vgensync";
const read = gensync({
  sync: (n: number) => n * 2,
  async: async (n: number) => n * 3,
});
const build = gensync(function* (n: number) {
  return yield* gensync.all([read(n), read(n + 1)]);
});
const immediate: number[] = build.sync(2);
const later: Promise<number[]> = build.async(2);
build.errback(2, (_error, value) => {
  void value?.map((n) => n * 2);
});
void [immediate, later];

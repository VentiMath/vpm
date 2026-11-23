import {
  Minipass,
  isStream,
  isReadable,
  isWritable,
  type PipeOptions,
} from "../index.cjs";
const bytes = new Minipass();
bytes.write(new Uint16Array([1, 2]));
const text = new Minipass<string>({ encoding: "utf8" });
const objects = new Minipass<{ path: string }>({ objectMode: true });
objects.write({ path: "src/main.ts" });
objects.on("data", (value) => value.path.toUpperCase());
const collected: Promise<{ path: string }[] & { dataLength: number }> =
  objects.collect();
const result: Promise<string> = text.concat();
const options: PipeOptions = { end: false, proxyErrors: true };
const dest: typeof text = bytes.pipe(text, options);
const unknownValue: unknown = bytes;
if (isStream(unknownValue)) unknownValue.on("error", () => {});
if (isReadable(unknownValue)) unknownValue.pipe(text);
if (isWritable(unknownValue)) unknownValue.end();
// @ts-expect-error Object streams require an explicit mode.
new Minipass<{ path: string }>();
// @ts-expect-error Byte streams reject arbitrary objects.
bytes.write({ bad: true });
// @ts-expect-error The object stream retains its chunk type.
objects.write(123);
void [collected, result, dest];

import RopeSequence from "vrope-sequence";
const r: RopeSequence<number> = RopeSequence.from<number>([1, 2] as const)
  .append([3])
  .prepend(RopeSequence.empty);
const value: number | undefined = r.get(1);
const mapped: string[] = r.map((n, i) => String(n + i));
const flat: number[] = r.flatten();
r.forEach((n, i) => n === i, 2, 0);
r.slice();
RopeSequence.from();
// @ts-expect-error sequences hold one element type
r.append(["x"]);
// @ts-expect-error length is read-only
r.length = 0;
void [value, mapped, flat];

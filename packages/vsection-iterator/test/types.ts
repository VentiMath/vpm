import create from "vsection-iterator";
const flat = create({ data: 10 });
const grouped = create({ data: [0, 2, 0, 1] as const, multiSection: true });
const next: create.Position = grouped.next([null, null]);
const last: boolean = flat.isLast([null, 9]);
grouped.prev([1, 1] as const);
// @ts-expect-error grouped data needs grouped mode
create({ data: [1, 2] });
// @ts-expect-error a cursor must contain two indices
flat.next([0]);
void next;
void last;

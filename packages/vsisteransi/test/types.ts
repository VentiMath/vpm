import { cursor, erase, scroll, beep, clear } from "../index.cjs";
const lines: string[] = [cursor.to(0,0),cursor.move(-1),erase.lines(4),scroll.up(),beep,clear.screen];
// @ts-expect-error counts are numeric
erase.lines("2");
// @ts-expect-error a column is required
cursor.to();
// @ts-expect-error no unimplemented arbitrary attributes
cursor.position();
void lines;

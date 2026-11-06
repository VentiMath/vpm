import OrderedMap, {type MapLike} from 'vorderedmap';
const empty = OrderedMap.from<number>(null);
const input: MapLike<number> = {a: 1};
const map = OrderedMap.from(input).update('b', 2).addBefore('a', '', 3).append(empty);
const value: number | undefined = map.get('a');
const record: Record<string, number> = map.toObject();
map.forEach((key, item) => { const pair: [string, number] = [key, item]; });
// @ts-expect-error wrong value type
map.update('a', 'x');
// @ts-expect-error use the factory
new OrderedMap();
// @ts-expect-error size is read-only
map.size = 1;

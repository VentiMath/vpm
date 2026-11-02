import schedule from 'vraf-schd';
const run = schedule((count: number, label: string) => count + label.length);
run(1, 'drag');
run.cancel();
// @ts-expect-error wrong callback argument type
run('wrong', 'drag');
// @ts-expect-error missing callback argument
run(1);
const result: void = run(2, 'scroll');
void result;

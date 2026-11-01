'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const load = () => import('../index.js');
const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};

test('duration strings consume the entire input and nonfinite units are rejected', async () => {
  const H = await load();
  for (const input of ['01:30junk', '01:30:20.1234', '01:30 ', Infinity, {days: Infinity}, {years: '2'}]) assert.equal(H.createDuration(input), null);
  assert.deepEqual(H.createDuration('-2.01:30:20.123'), {years:0,months:0,days:-2,milliseconds:-5420123});
});

test('range inversion clips to the visible window and preserves event order', async () => {
  const H = await load(), range=(start,end)=>({start:new Date(start),end:new Date(end)});
  const events = [range(30,40), range(-20,-10), range(2,4), range(3,6)];
  const original = events.slice();
  assert.deepEqual(H.invertRanges(events, range(0,10)), [range(0,2),range(6,10)]);
  assert.deepEqual(events, original);
  assert.deepEqual(H.invertRanges([range(-20,20)],range(0,10)),[]);
  assert.deepEqual(H.invertRanges([],range(0,10)),[range(0,10)]);
});

test('epoch zero is a valid range boundary and open bounds preserve negative dates', async () => {
  const H = await load(), env=new H.DateEnv({timeZone:'UTC',calendarSystem:'gregory',locale});
  assert.deepEqual(H.parseRange({start:0,end:1000},env), {start:new Date(0),end:new Date(1000)});
  assert.equal(+H.constrainMarkerToRange(new Date(-1000),{start:null,end:new Date(0)}),-1000);
});

test('formatters observe changes to a reused context', async () => {
  const H = await load(), env=new H.DateEnv({timeZone:'UTC',calendarSystem:'gregory',locale});
  const formatter=new H.NativeDateFormatter({hour:'numeric',hour12:false});
  const date={marker:new Date(0),instantMs:0};
  const before=H.joinDateTimeFormatParts(formatter.formatToParts(date,env));
  env.timeZone='Asia/Tokyo';
  const after=H.joinDateTimeFormatParts(formatter.formatToParts(date,env));
  assert.notEqual(after,before);
  assert.equal(after,new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'Asia/Tokyo'}).format(0));
});

test('extended-year month strings and long padding do not truncate', async () => {
  const H=await load();
  assert.equal(H.formatIsoMonthStr(H.arrayToUtcDate([-1,0,1])),'-000001-01');
  assert.equal(H.padStart(7,8),'00000007');
  H.registerCalendarSystem('__proto__',class {value=1;});
  assert.equal(H.createCalendarSystem('__proto__').value,1);
  assert.throws(()=>H.createCalendarSystem('toString'),RangeError);
});


test('named-zone conversion cache follows marker and zone changes', async () => {
  const H=await load(), env=new H.DateEnv({timeZone:'America/New_York',calendarSystem:'gregory',locale});
  const marker=new Date('2024-03-10T01:30:00Z');
  assert.equal(env.toDate(marker).toISOString(),'2024-03-10T06:30:00.000Z');
  assert.equal(env.offsetForMarker(marker),-300);
  marker.setUTCHours(3);
  assert.equal(env.offsetForMarker(marker),-240);
  assert.equal(env.toDate(marker).toISOString(),'2024-03-10T07:30:00.000Z');
  env.timeZone='Asia/Tokyo';
  assert.equal(env.offsetForMarker(marker),540);
  assert.equal(env.toDate(marker).toISOString(),'2024-03-09T18:30:00.000Z');
});

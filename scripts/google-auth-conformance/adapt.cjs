'use strict';
// Source files remain immutable. These explicit test changes are applied only to
// temporary copies; see README for upstream fixture corrections vs. VPM contracts.
module.exports = function adapt(file, source, upstream) {
  if (file === 'test.oauth2.ts.txt') {
    // The upstream tests manufacture padded standard-Base64 JWTs. Sign canonical
    // Base64url input on BOTH implementations, preserving each original assertion.
    source=source.replace(/Buffer\.from\((envelope|idToken)\)\.toString\('base64'\)/g,"Buffer.from($1).toString('base64url')")
      .replaceAll("signer.sign(privateKey, 'base64')","signer.sign(privateKey, 'base64url')");
    const start=source.indexOf("it('should fail due to token being used to late'"), end=source.indexOf("it('should fail due to invalid issuer'",start);
    if(start<0||end<0)throw new Error('Expired-token fixture changed');
    source=source.slice(0,start)+source.slice(start,end).replace('const issueTime = now - clockSkews * 2;', 'const issueTime = now - maxLifetimeSecs;')+source.slice(end);
    if(!upstream)source=source.replace('/Can\'t parse token payload/',"/Can't parse token envelope or payload/");
  }
  if (!upstream && file === 'test.authclient.ts.txt') {
    source=source.replaceAll('testLogSink.logs[0].args.length, 4','testLogSink.logs[0].args.length, 1')
      .replaceAll("assert.deepStrictEqual(testLogSink.logs[0].args[1], 'testMethod');","assert.deepStrictEqual(testLogSink.logs[0].args[1], undefined);")
      .replace(/assert\.deepStrictEqual\(\s*\(testLogSink\.logs\[0\]\.args\[3\] as GaxiosOptionsPrepared\)[\s\S]*?\n        \);/g,'assert.deepStrictEqual(testLogSink.logs[0].args[3], undefined);')
      .replace(/assert\.deepStrictEqual\(testLogSink\.logs\[0\]\.args\[3\] as \{test: string\}, \{[\s\S]*?\n        \}\);/g,'assert.deepStrictEqual(testLogSink.logs[0].args[3], undefined);')
      .replace("assert.deepStrictEqual(responseLog.args[2], {test: 'test!'});",'assert.deepStrictEqual(responseLog.args, ["Authentication response"]);')
      .replace("assert.deepStrictEqual(errorLog.args[2], {message: 'boo!'});",'assert.deepStrictEqual(errorLog.args, ["Authentication request error"]);')
      .replace('logs payloads without a method name at DEBUG severity','logs static lifecycle messages without a method name at DEBUG severity');
  }
  if (!upstream && file === 'gtoken/test.revokeToken.ts.txt') {
    source=source.replace('`https://oauth2.googleapis.com/revoke?token=${accessToken}`',"'https://oauth2.googleapis.com/revoke'")
      .replace('url: expectedUrl,',"url: expectedUrl, method: 'POST', data: new URLSearchParams({token: accessToken}),");
  }
  return source;
};

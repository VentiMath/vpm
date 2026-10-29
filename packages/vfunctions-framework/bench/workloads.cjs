'use strict';
// Identical HTTP payloads and assertions across all framework variants.
module.exports = [
  { name: 'http-get', handler: (req, res) => res.send('hello'), expected: 'hello' },
  { name: 'http-deep-path', path: '/users/alice/files/a/b/c?sort=name&limit=20', handler: (req, res) => res.send('hello'), expected: 'hello' },
  { name: 'http-json', headers: { 'content-type': 'application/json' }, body: '{"name":"alice","count":42}',
    handler: (req, res) => res.json(req.body), expected: '{"name":"alice","count":42}' },
  { name: 'http-form', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=alice&tags[]=a&tags[]=b',
    handler: (req, res) => res.json(req.body), expected: '{"name":"alice","tags":["a","b"]}' },
  { name: 'http-json-charset', headers: { 'content-type': 'Application/JSON; charset=UTF-8' }, body: '{"name":"alice","count":42}',
    handler: (req, res) => res.json(req.body), expected: '{"name":"alice","count":42}' },
  { name: 'http-form-charset', headers: { 'content-type': 'Application/X-Www-Form-Urlencoded; charset=UTF-8' }, body: 'name=alice&tags[]=a&tags[]=b',
    handler: (req, res) => res.json(req.body), expected: '{"name":"alice","tags":["a","b"]}' },
  { name: 'http-async-json', headers: { 'content-type': 'application/json' }, body: '{"name":"alice","count":42}',
    handler: async (req, res) => { await Promise.resolve(); res.json(req.body); }, expected: '{"name":"alice","count":42}' },
  { name: 'cloud-event', signatureType: 'cloudevent',
    body: '{"specversion":"1.0","id":"1","type":"example","source":"/test","data":{"name":"alice"}}',
    headers: { 'content-type': 'application/cloudevents+json' }, handler: event => event.data, expected: '{"name":"alice"}' },
];

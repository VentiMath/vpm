# von-finished

Observe when an HTTP request or response finishes, closes, or encounters a socket
error. Callbacks retain the async context in which they were registered.

`von-finished` is a modernized counterpart to `on-finished` 2.4.1 for Node.js 20+
and Bun. Its only external runtime dependency is VPM's [`vee-first`](../vee-first).

## Use

```js
const http = require('node:http');
const onFinished = require('von-finished');

http.createServer((request, response) => {
  onFinished(response, (error, message) => {
    // Release resources associated with this response.
  });
  response.end('Hello');
}).listen(3000);
```

ES modules can use `import onFinished from 'von-finished'`.

## API

### `onFinished(message, listener)`

Registers `listener(error, message)` and returns the original message. Both HTTP
requests and responses are supported. A pending message is observed through its
`end`/`finish` events and its socket's `error`/`close` events. Sockets assigned later
through the `socket` event are supported.

If the message is already finished, the callback is scheduled with `setImmediate`.
Otherwise, callbacks run during completion dispatch, after this package's listeners
have been removed. Multiple callbacks on one message share a set of event listeners
and run in registration order, each in its own registration-time async context.

Normal completion and socket closure pass `null` as the error. Socket error payloads
are passed through unchanged. Callback exceptions propagate; as in `on-finished`,
a thrown callback stops dispatch to later queued callbacks. Event listeners and
async resources are cleaned up before the exception leaves the completion handler.

Completion follows the HTTP message lifecycle; it is not an acknowledgment that
the remote client has received or processed the response.

### `onFinished.isFinished(message)`

Returns `true` for a finished message, `false` for a pending one, and `undefined`
for an unrecognized message shape. It preserves the `on-finished` state checks:

- Responses: `finished`, or an assigned socket that is no longer writable.
- Requests: an upgrade, no readable socket, or a complete message whose readable
  side has ended.

Unknown message shapes passed to `onFinished()` take the deferred callback path.
Upgrade and CONNECT requests retain the upstream completion conventions. This
utility observes HTTP messages, not the lifetime of an upgraded connection or tunnel.

## Improvements and compatibility

- Uses `vee-first` for event selection and listener cleanup.
- Provides TypeScript declarations, including the original message's return and
  callback types, without requiring a Node.js types package for consumers.
- Keeps callback queues in a `WeakMap`; it does not add `__onFinished` to messages.
- Uses modern `AsyncResource` support and releases each resource after dispatch.
- Removes Node.js 0.8 socket-assignment patches and old runtime fallbacks.
- Cleans up a pending socket listener when a message finishes before getting a socket.
- Queues the first callback before event registration, so synchronous registration
  hooks cannot lose it. Failed registration rolls back the subscriptions.

The public callback API, returned message, deferred completion, and tri-state
`isFinished()` behavior are retained. Invalid callbacks receive an immediate
`TypeError`. Private `__onFinished` state is intentionally unsupported.

## Install from this repository

Create both package archives from a VPM checkout:

```sh
cd packages/vee-first
bun pm pack
cd ../von-finished
bun pm pack
```

In the consuming project's `package.json`, point the dependency and its override
to the local archives:

```json
{
  "dependencies": {
    "von-finished": "file:/absolute/path/to/vpm/packages/von-finished/von-finished-0.1.0.tgz"
  },
  "overrides": {
    "vee-first": "file:/absolute/path/to/vpm/packages/vee-first/vee-first-0.1.0.tgz"
  }
}
```

Run `bun install`. Packing converts the workspace dependency to the matching
`vee-first` version; the override resolves that version to your local archive.
These packages have not been published to a registry, so the local override is
required for this installation method.

## Origin and license

Derived from [`on-finished` 2.4.1](https://github.com/jshttp/on-finished/tree/v2.4.1),
by Jonathan Ong and Douglas Christopher Wilson. MIT licensed; upstream copyright
and license notices are preserved in [LICENSE](LICENSE).

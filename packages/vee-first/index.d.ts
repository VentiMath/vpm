/** Wait for the first event, remove competing listeners, and invoke the listener once. */
declare function first(
  sources: readonly first.EventSource[],
  listener?: first.Listener,
): first.Handle;

declare namespace first {
  type EventName = string | symbol;

  /** Structural interface: consumers do not need Node.js types to use the package. */
  interface Emitter {
    on(event: EventName, listener: (...args: any[]) => void): unknown;
    removeListener(event: EventName, listener: (...args: any[]) => void): unknown;
  }

  type EventSource = readonly [emitter: Emitter, event: EventName, ...events: EventName[]];

  /** Error-event payloads may be any value; other events pass null as the first argument. */
  type Listener = (error: unknown, emitter: Emitter, event: EventName, args: unknown[]) => void;

  interface Handle {
    /** Set or replace the callback before an event is emitted. */
    (listener: Listener): void;
    /** Remove this group's listeners. Repeated calls are harmless. */
    cancel(): void;
  }
}

export = first;

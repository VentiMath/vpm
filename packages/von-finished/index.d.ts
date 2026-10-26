import first = require('vee-first');

/** Observe completion once, preserving registration-time async context. Returns the original message. */
declare function onFinished<T extends onFinished.Message>(
  message: T,
  listener: (error: unknown, message: T) => void,
): T;

declare namespace onFinished {
  interface Socket extends first.Emitter {
    readable?: boolean;
    writable?: boolean;
  }

  interface MessageState {
    socket?: Socket | null;
    finished?: boolean;
    complete?: boolean;
    readable?: boolean;
    upgrade?: boolean;
  }

  /** Structural HTTP message interface; consumers do not need Node.js type packages. */
  interface Message extends first.Emitter, MessageState {}

  /** True when complete, false when pending, undefined for an unrecognized message shape. */
  function isFinished(message: MessageState): boolean | undefined;
}

export = onFinished;

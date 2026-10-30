/** Emit one reading/writing notification after each direction's first call. */
declare function streamEvents<T extends streamEvents.StreamLike>(stream: T): T;
declare function streamEvents<T extends streamEvents.StreamLike>(this: T): T;
declare namespace streamEvents {
  interface StreamLike {
    emit(event: string | symbol, ...args: any[]): boolean;
    _read?: (...args: any[]) => any;
    _write?: (...args: any[]) => any;
  }
}
export = streamEvents;

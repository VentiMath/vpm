declare function isStream(value:unknown):value is isStream.StreamLike;
declare namespace isStream {
  interface StreamLike {pipe(...args:any[]):any;}
  interface ReadableLike extends StreamLike {readonly readable?:boolean;_read(...args:any[]):any;readonly _readableState:object;}
  interface WritableLike extends StreamLike {readonly writable?:boolean;_write(...args:any[]):any;readonly _writableState:object;}
  interface DuplexLike extends ReadableLike,WritableLike {}
  interface TransformLike extends DuplexLike {_transform(...args:any[]):any;}
  function readable(value:unknown):value is ReadableLike;
  function writable(value:unknown):value is WritableLike;
  function duplex(value:unknown):value is DuplexLike;
  function transform(value:unknown):value is TransformLike;
}
export = isStream;

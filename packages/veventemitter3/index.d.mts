declare class EventEmitter<Events extends EventEmitter.ValidEventTypes = string | symbol, Context = any> {
 static prefixed: string | boolean;
 eventNames(): EventEmitter.EventNames<Events>[];
 listeners<Key extends EventEmitter.EventNames<Events>>(event: Key): EventEmitter.EventListener<Events, Key>[];
 listenerCount(event: EventEmitter.EventNames<Events>): number;
 emit<Key extends EventEmitter.EventNames<Events>>(event: Key, ...args: EventEmitter.EventArgs<Events, Key>): boolean;
 on<Key extends EventEmitter.EventNames<Events>>(event: Key, listener: EventEmitter.EventListener<Events, Key>, context?: Context): this;
 addListener<Key extends EventEmitter.EventNames<Events>>(event: Key, listener: EventEmitter.EventListener<Events, Key>, context?: Context): this;
 once<Key extends EventEmitter.EventNames<Events>>(event: Key, listener: EventEmitter.EventListener<Events, Key>, context?: Context): this;
 removeListener<Key extends EventEmitter.EventNames<Events>>(event: Key, listener?: EventEmitter.EventListener<Events, Key>, context?: Context, once?: boolean): this;
 off<Key extends EventEmitter.EventNames<Events>>(event: Key, listener?: EventEmitter.EventListener<Events, Key>, context?: Context, once?: boolean): this;
 removeAllListeners(event?: EventEmitter.EventNames<Events>): this;
}
declare namespace EventEmitter {
 type ValidEventTypes = string | symbol | object;
 type EventNames<E extends ValidEventTypes> = E extends string | symbol ? E : keyof E;
 type ArgumentMap<E extends object> = { [K in keyof E]: E[K] extends (...args: any[]) => any ? Parameters<E[K]> : E[K] extends any[] ? E[K] : any[] };
 type EventArgs<E extends ValidEventTypes, K extends EventNames<E>> = E extends string | symbol ? any[] : K extends keyof E ? E[K] extends (...args: any[]) => any ? Parameters<E[K]> : E[K] extends any[] ? E[K] : any[] : never;
 type EventListener<E extends ValidEventTypes, K extends EventNames<E>> = (...args: EventArgs<E, K>) => void;
 interface ListenerFn<Args extends any[] = any[]> { (...args: Args): void; }
 interface EventEmitterStatic { new <E extends ValidEventTypes = string | symbol, C = any>(): EventEmitter<E, C>; }
 const EventEmitter: EventEmitterStatic;
}
export { EventEmitter };
export default EventEmitter;

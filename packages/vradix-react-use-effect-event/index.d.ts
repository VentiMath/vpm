type Callback = (...args: any[]) => any;
export declare function useEffectEvent<T extends Callback>(callback: T): T;
export declare function useEffectEvent<T extends Callback>(callback?: T): (...args: Parameters<T>) => ReturnType<T> | undefined;

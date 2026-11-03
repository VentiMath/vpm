import type {Dispatch, SetStateAction} from 'react';
export interface ControllableStateOptions<T> {
  prop?: T;
  defaultProp: T;
  onChange?: (value: T) => void;
  caller?: string;
}
export declare function useControllableState<T>(options: ControllableStateOptions<T>): [T, Dispatch<SetStateAction<T>>];
type State<T, S extends object> = S & {state: T};
type Action = {type: string};
export declare function useControllableStateReducer<T, S extends object, A extends Action>(
  reducer: (state: State<T, S>, action: A) => State<T, S>,
  options: ControllableStateOptions<T>, initialState: S
): [State<T, S>, Dispatch<A>];
export declare function useControllableStateReducer<T, S extends object, I, A extends Action>(
  reducer: (state: State<T, S>, action: A) => State<T, S>,
  options: ControllableStateOptions<T>, initialArg: I,
  init: (initial: I & {state: T}) => S
): [State<T, S>, Dispatch<A>];

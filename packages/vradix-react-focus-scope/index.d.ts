import type * as React from 'react';
import type {Primitive} from 'vradix-react-primitive';
type AutoFocusHandler = {bivarianceHack(event: Event): void}['bivarianceHack'];
export interface FocusScopeProps extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  loop?: boolean | undefined;
  trapped?: boolean | undefined;
  branches?: HTMLElement[] | undefined;
  onMountAutoFocus?: AutoFocusHandler | undefined;
  onUnmountAutoFocus?: AutoFocusHandler | undefined;
}
export declare const FocusScope: React.ForwardRefExoticComponent<FocusScopeProps & React.RefAttributes<HTMLDivElement>>;
export {FocusScope as Root};
export interface FocusScopeBranchRegistry { add(node: HTMLElement): void; remove(node: HTMLElement): void; }
export interface FocusScopeBranchProviderProps {
  registry: FocusScopeBranchRegistry | null | undefined;
  children?: React.ReactNode | undefined;
}
export declare function FocusScopeBranchProvider(props: FocusScopeBranchProviderProps): React.ReactNode;
export declare function useFocusScopeBranchRegistry(): {readonly nodes: HTMLElement[]; readonly registry: FocusScopeBranchRegistry};
export declare function useFocusScopeBranch(node: HTMLElement | null): void;

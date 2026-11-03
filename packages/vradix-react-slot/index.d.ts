import type {FC, ForwardRefExoticComponent, HTMLAttributes, PropsWithoutRef, ReactNode, RefAttributes} from 'react';
export type SlotProps<Elem extends Element = HTMLElement, Props = HTMLAttributes<Elem>> = Props & {children?: ReactNode};
export declare function createSlot<Elem extends Element = HTMLElement, Props = HTMLAttributes<Elem>>(ownerName: string): ForwardRefExoticComponent<PropsWithoutRef<SlotProps<Elem, Props>> & RefAttributes<Elem>>;
export declare const Slot: ForwardRefExoticComponent<SlotProps & RefAttributes<HTMLElement>>;
export {Slot as Root};
type SlottableProps = {child?: never; children: ReactNode} | {child: ReactNode; children: (children: ReactNode) => ReactNode};
interface SlottableComponent extends FC<SlottableProps> {__radixId: symbol}
export declare function createSlottable(ownerName: string): SlottableComponent;
export declare const Slottable: SlottableComponent;

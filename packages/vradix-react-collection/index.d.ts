import type * as React from 'react';
import type { CreateScope, Scope } from 'vradix-react-context';
import type { Slot } from 'vradix-react-slot';
export interface CollectionProps extends React.ComponentPropsWithoutRef<typeof Slot> { scope: Scope; }
export declare function createCollection<ItemElement extends HTMLElement, ItemData = {}>(name: string): readonly [
  {
    readonly Provider: React.FC<{ children?: React.ReactNode | undefined; scope: Scope }>;
    readonly Slot: React.ForwardRefExoticComponent<CollectionProps & React.RefAttributes<HTMLElement>>;
    readonly ItemSlot: React.ForwardRefExoticComponent<React.PropsWithoutRef<ItemData & { children: React.ReactNode; scope: Scope }> & React.RefAttributes<ItemElement>>;
  },
  (scope: Scope) => () => ({ ref: React.RefObject<ItemElement | null> } & ItemData)[],
  CreateScope
];

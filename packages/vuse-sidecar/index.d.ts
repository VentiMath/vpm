import type { ComponentType, FunctionComponent, ReactNode } from "react";
export interface SideMedium<T> {
  read(): T | undefined;
  useMedium(value: T): () => void;
  assignMedium(handler: (value: T) => unknown): void;
  assignSyncMedium(handler: (value: T) => unknown): void;
  options?: { async?: boolean; ssr?: boolean };
}
export type SideCarMedium<T = {}> = SideMedium<ComponentType<T> | null>;
export type SideCarHOC<T = {}> = { readonly sideCar: SideCarMedium<T> };
export type SideCarComponent<T> = FunctionComponent<T & SideCarHOC<T>>;
export type Importer<T> = () => Promise<
  ComponentType<T> | { default: ComponentType<T> }
>;
export function createMedium<T>(
  initial?: T,
  middleware?: (value: T, assigned: boolean) => T,
): Readonly<SideMedium<T>>;
export function createSidecarMedium<T = {}>(options?: {
  async?: boolean;
  ssr?: boolean;
}): Readonly<SideCarMedium<T>>;
export function exportSidecar<T>(
  medium: SideCarMedium<T>,
  component: ComponentType<T>,
): SideCarComponent<T> & { readonly isSideCarExport: true };
export function useSidecar<T>(
  importer: Importer<T>,
  medium?: SideMedium<any>,
): [ComponentType<T> | null | undefined, Error | null];
export function sidecar<T>(
  importer: Importer<T>,
  fallback?: ReactNode,
): FunctionComponent<Omit<T, "sideCar"> & SideCarHOC<Omit<T, "sideCar">>>;
export function renderCar<A extends unknown[], P>(
  component: ComponentType<P & { children: (...args: A) => ReactNode }>,
  defaults: (props: P) => A,
): FunctionComponent<P & { children: (...args: A) => ReactNode }>;
export function setConfig(config: { onError?: (error: Error) => void }): void;

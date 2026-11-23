/** Cached Podman/Docker filesystem evidence; not proof of isolation. */
declare const isInsideContainer: {
  (): boolean;
  readonly default: typeof isInsideContainer;
};
export = isInsideContainer;

import * as React from "react";
import {
  SnackbarProvider,
  useSnackbar,
  enqueueSnackbar,
  closeSnackbar,
  MaterialDesignContent,
  SnackbarContent,
  type SnackbarKey,
  type CustomContentProps,
} from "vnotistack";
const Child = () => {
  const api = useSnackbar();
  const id: SnackbarKey = api.enqueueSnackbar("User settings saved.", {
    variant: "success",
  });
  api.closeSnackbar(id);
  return null;
};
React.createElement(
  SnackbarProvider,
  {
    maxSnack: 5,
    anchorOrigin: { vertical: "bottom", horizontal: "right" },
    classes: { containerRoot: "bottom-0 right-0 mb-13" },
    onClose: (_, reason, key) => {
      const r: string = reason;
      const k: SnackbarKey | undefined = key;
    },
  },
  React.createElement(Child),
);
const key = enqueueSnackbar({
  message: "Save failed",
  key: "save",
  variant: "error",
  persist: true,
  action: (id) =>
    React.createElement(
      "button",
      { onClick: () => closeSnackbar(id) },
      "Dismiss",
    ),
});
closeSnackbar(key);
const custom = React.forwardRef<HTMLDivElement, CustomContentProps>((p, ref) =>
  React.createElement(SnackbarContent, { ref }, p.message),
);
React.createElement(SnackbarProvider, {
  Components: { success: custom },
  domRoot: document.body,
});
React.createElement(MaterialDesignContent, {
  id: 1,
  message: "Done",
  variant: "success",
});
// @ts-expect-error unsupported animation adapters must not silently pass
React.createElement(SnackbarProvider, { TransitionComponent: custom });
// @ts-expect-error invalid variant
apiTypeCheck({ variant: "wrong" });
function apiTypeCheck(options: import("vnotistack").OptionsObject) {
  return options;
}

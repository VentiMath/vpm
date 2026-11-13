import React from "react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  ButtonBase,
  Button,
  IconButton,
  Fab,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
} from "@buttons";
const RouterLink = React.forwardRef(({ to, ...props }, ref) => (
  <a {...props} ref={ref} href={to} />
));
export function Scene({
  mode = "light",
  rtl = false,
  variables = false,
  tick = 0,
}) {
  const [exclusive, setExclusive] = React.useState("math"),
    [multiple, setMultiple] = React.useState([1]),
    [loading, setLoading] = React.useState(false),
    [disabled, setDisabled] = React.useState(false);
  const action = React.useRef(null),
    root = React.useRef(null),
    events = React.useRef([]);
  const cache = React.useMemo(
    () =>
      createCache({
        key: rtl ? "buttonsrtl" : "buttonsltr",
        stylisPlugins: rtl ? [rtlPlugin] : [],
      }),
    [rtl],
  );
  React.useEffect(() => () => cache.sheet.flush(), [cache]);
  const theme = React.useMemo(
    () =>
      createTheme({
        cssVariables: variables,
        direction: rtl ? "rtl" : "ltr",
        palette: {
          mode,
          primary: { main: "#2459a9" },
          secondary: { main: "#8b336e" },
        },
        components: {
          MuiButtonBase: { defaultProps: { disableRipple: true } },
          MuiButton: {
            defaultProps: { size: "medium" },
            styleOverrides: {
              root: ({ ownerState }) => ({
                ...(ownerState.variant === "contained" &&
                ownerState.color === "primary"
                  ? { backgroundImage: "linear-gradient(#4265af, #2459a9)" }
                  : {}),
                textTransform: "none",
                fontWeight: 500,
                lineHeight: 1,
                "&.Mui-focusVisible": {
                  outline: "1px solid #123456",
                  outlineOffset: "2px",
                },
              }),
              sizeSmall: { minHeight: 28, minWidth: 28, padding: "6px 12px" },
              sizeMedium: { minHeight: 32, minWidth: 32, padding: "6px 12px" },
              sizeLarge: { minHeight: 36, minWidth: 36, padding: "8px 16px" },
              containedPrimary: {
                backgroundImage: "linear-gradient(#4265af, #2459a9)",
              },
              startIcon: {
                fontSize: 16,
                "& > *:nth-of-type(1)": { fontSize: "inherit" },
              },
              endIcon: { fontSize: 16 },
            },
            variants: [
              {
                props: { variant: "quiet" },
                style: { backgroundColor: "#edf0f5", borderRadius: 9 },
              },
            ],
          },
          MuiIconButton: {
            styleOverrides: {
              root: { borderRadius: 8 },
              sizeMedium: { width: 32, height: 32, maxHeight: 32 },
              sizeSmall: { width: 28, height: 28, maxHeight: 28 },
            },
          },
        },
      }),
    [mode, rtl, variables],
  );
  React.useLayoutEffect(() => {
    window.controls = { action, root, events, setLoading, setDisabled };
  });
  const record = (type) => (event) => events.current.push([type, event.type]);
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <div id="scene" dir={rtl ? "rtl" : "ltr"}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              events.current.push(["submit", e.type]);
            }}
          >
            <Button
              id="normal"
              ref={root}
              action={action}
              variant="contained"
              startIcon={<span>+</span>}
              endIcon={<span>→</span>}
              onClick={record("normal")}
            >
              Join contest
            </Button>
            <Button id="submit" type="submit">
              Save form
            </Button>
          </form>
          <ButtonBase
            id="non-native"
            component="div"
            onClick={record("non-native")}
          >
            Div action
          </ButtonBase>
          <Button id="disabled" disabled onClick={record("disabled")}>
            Blocked
          </Button>
          <Button
            id="disabled-link"
            href="#blocked"
            disabled
            onClick={record("disabled-link")}
          >
            Blocked link
          </Button>
          <Button
            id="route"
            component={RouterLink}
            to="#resources"
            onClick={record("route")}
          >
            Resources
          </Button>
          <Button id="dynamic" disabled={disabled} action={React.useRef(null)}>
            Dynamic
          </Button>
          <Button id="small" size="small" variant="outlined">
            Small
          </Button>
          <Button
            id="quiet"
            variant="quiet"
            sx={{ m: 1, p: { xs: 1, md: 2 }, borderRadius: 3 }}
          >
            Quiet
          </Button>
          <IconButton id="icon" aria-label="Open navigation" size="small">
            <span>≡</span>
          </IconButton>
          <Fab id="fab" aria-label="Toggle panel">
            +
          </Fab>
          <ButtonGroup
            id="group"
            aria-label="Pages"
            color="secondary"
            variant="contained"
            disableElevation
          >
            <Button id="previous">Previous</Button>
            <Button id="next" disabled>
              Next
            </Button>
          </ButtonGroup>
          <ToggleButtonGroup
            id="exclusive"
            exclusive
            size="small"
            value={exclusive}
            onChange={(_, value) => {
              events.current.push(["exclusive", value]);
              setExclusive(value);
            }}
            aria-label="Subject"
          >
            <ToggleButton value="math">Math</ToggleButton>
            <ToggleButton value="language">Language</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            id="multiple"
            value={multiple}
            onChange={(_, values) => {
              events.current.push(["multiple", values]);
              setMultiple(values);
            }}
            aria-label="Days"
          >
            <ToggleButton value={1}>Mon</ToggleButton>
            <ToggleButton value={2}>Tue</ToggleButton>
            <ToggleButton value={3} disabled>
              Wed
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButton
            value="stop"
            id="cancel-toggle"
            onClick={(e) => e.preventDefault()}
            onChange={record("cancel-change")}
          >
            Prevent
          </ToggleButton>
          <Button
            id="loading"
            loading={loading}
            onClick={record("loading")}
            variant="contained"
          >
            Submit answers
          </Button>
          <IconButton id="loading-icon" aria-label="Refresh" loading={loading}>
            <span>↻</span>
          </IconButton>
          <output id="tick">{tick}</output>
        </div>
      </ThemeProvider>
    </CacheProvider>
  );
}

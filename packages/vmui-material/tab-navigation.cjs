"use strict";
const React = require("react");
const { styled, useThemeProps, useTheme } = require("./theme.cjs");
const { ButtonBase } = require("./buttons.cjs");

const h = React.createElement;
const join = (...names) => names.filter(Boolean).join(" ");
const titleCase = (name) => name[0].toUpperCase() + name.slice(1);
const utility = (component, slot) =>
  ([
    "disabled",
    "selected",
    "focusVisible",
    "active",
    "checked",
    "completed",
    "error",
    "expanded",
    "focused",
    "readOnly",
    "required",
  ].includes(slot)
    ? "Mui-"
    : component + "-") + slot;
const getTabUtilityClass = (slot) => utility("MuiTab", slot);
const getTabsUtilityClass = (slot) => utility("MuiTabs", slot);
const classMap = (keys, get) =>
  Object.freeze(Object.fromEntries(keys.split(" ").map((key) => [key, get(key)])));
const tabClasses = classMap(
  "root labelIcon textColorInherit textColorPrimary textColorSecondary selected disabled fullWidth wrapped icon",
  getTabUtilityClass,
);
const tabsClasses = classMap(
  "root vertical list centered scroller fixed scrollableX scrollableY hideScrollbar scrollButtons scrollButtonsHideMobile indicator",
  getTabsUtilityClass,
);

const TabRoot = styled(ButtonBase, {
  name: "MuiTab",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, styles) => [
    styles.root,
    styles["textColor" + titleCase(s.textColor)],
    s.icon && s.label && styles.labelIcon,
    s.fullWidth && styles.fullWidth,
    s.wrapped && styles.wrapped,
    { "& .MuiTab-icon": styles.icon },
  ],
})(({ theme, ownerState: s }) => {
  const palette = theme.vars?.palette || theme.palette;
  const stacked = s.iconPosition === "top" || s.iconPosition === "bottom";
  const gap = {
    top: ["marginBottom", 6],
    bottom: ["marginTop", 6],
    start: ["marginRight", 8],
    end: ["marginLeft", 8],
  }[s.iconPosition];
  return {
    fontFamily: theme.typography.fontFamily,
    fontWeight: 500,
    fontSize: "0.875rem",
    letterSpacing: "0.02857em",
    textTransform: "uppercase",
    ...theme.typography.button,
    minWidth: 90,
    maxWidth: 360,
    minHeight: s.icon && s.label ? 72 : 48,
    padding: s.icon && s.label ? "9px 16px" : "12px 16px",
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
    whiteSpace: "normal",
    boxSizing: "border-box",
    textAlign: "center",
    flexDirection: stacked ? "column" : "row",
    lineHeight: 1.25,
    ...(s.fullWidth && { flexGrow: 1, flexShrink: 1, flexBasis: 0, maxWidth: "none" }),
    ...(s.wrapped && { fontSize: "0.75rem" }),
    ...(s.icon && s.label && { "& > .MuiTab-icon": { [gap[0]]: gap[1] } }),
    ...(s.textColor === "inherit"
      ? {
          color: "inherit",
          opacity: 0.6,
          "&.Mui-selected": { opacity: 1 },
          "&.Mui-disabled": { opacity: 0.38 },
        }
      : {
          color: palette.text.secondary,
          "&.Mui-selected": { color: palette[s.textColor]?.main },
          "&.Mui-disabled": { color: palette.text.disabled },
        }),
  };
});
const Tab = React.forwardRef(function Tab(input, ref) {
  const p = useThemeProps({ name: "MuiTab", props: input });
  const {
    label,
    icon,
    iconPosition = "top",
    value,
    selected = false,
    textColor = "inherit",
    fullWidth = false,
    wrapped = false,
    disabled = false,
    disableFocusRipple = false,
    indicator,
    onChange,
    onClick,
    onFocus,
    selectionFollowsFocus,
    className,
    classes = {},
    ...button
  } = p;
  const cls = (key) => join(tabClasses[key], classes[key]);
  const decorated =
    icon && label && React.isValidElement(icon)
      ? React.cloneElement(icon, { className: join(icon.props.className, cls("icon")) })
      : icon;
  const iconFirst = iconPosition === "start" || iconPosition === "top";
  const state = { ...p, iconPosition, selected, textColor, wrapped, fullWidth };
  return h(
    TabRoot,
    {
      ...button,
      ref,
      role: "tab",
      disabled,
      ownerState: state,
      "aria-selected": selected,
      tabIndex: button.tabIndex ?? (selected ? 0 : -1),
      focusRipple: !disableFocusRipple,
      className: join(
        cls("root"),
        cls("textColor" + titleCase(textColor)),
        icon && label && cls("labelIcon"),
        selected && cls("selected"),
        disabled && cls("disabled"),
        fullWidth && cls("fullWidth"),
        wrapped && cls("wrapped"),
        className,
      ),
      onClick: (event) => {
        if (!selected) onChange?.(event, value);
        onClick?.(event);
      },
      onFocus: (event) => {
        if (selectionFollowsFocus && !selected) onChange?.(event, value);
        onFocus?.(event);
      },
    },
    iconFirst ? decorated : label,
    iconFirst ? label : decorated,
    indicator,
  );
});
const Root = styled("div", {
  name: "MuiTabs",
  slot: "Root",
  overridesResolver: ({ ownerState: s }, styles) => [styles.root, s.vertical && styles.vertical],
})(({ ownerState: s }) => ({
  display: "flex",
  overflow: "hidden",
  minHeight: 48,
  WebkitOverflowScrolling: "touch",
  ...(s.vertical && { flexDirection: "column" }),
}));
const Scroller = styled("div", {
  name: "MuiTabs",
  slot: "Scroller",
  overridesResolver: (_, styles) => [styles.scroller, styles.fixed],
})({
  position: "relative",
  display: "inline-block",
  flex: "1 1 auto",
  whiteSpace: "nowrap",
  width: "100%",
  overflowX: "hidden",
});
const ScrollButton=styled("button")(({ownerState:s})=>({border:0,background:"transparent",color:"inherit",flexShrink:0,width:s.vertical?undefined:40,height:s.vertical?40:undefined,cursor:"pointer",opacity:1,"&:disabled":{opacity:0},...(!s.allowScrollButtonsMobile&&{"@media (max-width:599.95px)":{display:"none"}})}));
const List = styled("div", {
  name: "MuiTabs",
  slot: "List",
  overridesResolver: ({ ownerState: s }, styles) => [styles.list, s.centered && styles.centered],
})(({ ownerState: s }) => ({
  display: "flex",
  ...(s.vertical && { flexDirection: "column" }),
  ...(s.centered && { justifyContent: "center" }),
}));
const Indicator = styled("span", {
  name: "MuiTabs",
  slot: "Indicator",
  overridesResolver: (_, styles) => styles.indicator,
})(({ theme, ownerState: s }) => ({
  position: "absolute",
  backgroundColor: (theme.vars?.palette || theme.palette)[s.indicatorColor]?.main,
  transition: theme.transitions?.create?.("all") || "all 300ms cubic-bezier(0.4,0,0.2,1)",
  ...(s.vertical ? { right: 0, width: 2, height: "100%" } : { bottom: 0, height: 2, width: "100%" }),
}));
function navigate(event, vertical, rtl) {
  const current = event.target;
  if (current.getAttribute("role") !== "tab" || current.parentElement !== event.currentTarget) return;
  const tabs = Array.from(event.currentTarget.children).filter(
    (node) =>
      node.getAttribute("role") === "tab" && !node.disabled && node.getAttribute("aria-disabled") !== "true",
  );
  const index = tabs.indexOf(current);
  if (index < 0) return;
  const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
  const prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
  const dest = {
    Home: 0,
    End: tabs.length - 1,
    [next]: (index + 1) % tabs.length,
    [prev]: (index + tabs.length - 1) % tabs.length,
  }[event.key];
  if (Number.isInteger(dest)) {
    event.preventDefault();
    tabs[dest].focus();
  }
}
const Tabs = React.forwardRef(function Tabs(input, ref) {
  const p = useThemeProps({ name: "MuiTabs", props: input });
  const {
    component,
    children,
    value,
    onChange,
    orientation = "horizontal",
    variant = "standard",
    scrollButtons = "auto",
    allowScrollButtonsMobile = false,
    visibleScrollbar = false,
    action,
    centered = false,
    selectionFollowsFocus = false,
    indicatorColor = "primary",
    textColor = "primary",
    classes = {},
    className,
    "aria-label": label,
    "aria-labelledby": labelled,
    ...root
  } = p;
  if (!["standard","fullWidth","scrollable"].includes(variant))
    throw new RangeError("Invalid Tabs variant");
  const vertical = orientation === "vertical",
    rtl = useTheme().direction === "rtl";
  const scrollable = variant === "scrollable";
  const state = { ...p, vertical, centered, indicatorColor, scrollable };
  const cls = (key) => join(tabsClasses[key], classes[key]);
  const scroller = React.useRef(null),
    list = React.useRef(null);
  const [mounted, setMounted] = React.useState(false);
  const [bounds, setBounds] = React.useState({});
  const [edges,setEdges] = React.useState({start:true,end:true});
  // Keep the indicator in scroller coordinates, including a scrolled RTL strip.
  const measure = React.useCallback(() => {
    const box = scroller.current,
      tab = list.current?.querySelector('[role="tab"][aria-selected="true"]');
    const axis = vertical ? "top" : rtl ? "right" : "left",
      size = vertical ? "height" : "width";
    let offset = 0,
      length = 0;
    if (box && tab) {
      const viewport = box.getBoundingClientRect(),
        item = tab.getBoundingClientRect();
      offset = vertical
        ? item.top - viewport.top + box.scrollTop
        : rtl
          ? viewport.right - item.right - box.scrollLeft
          : item.left - viewport.left + box.scrollLeft;
      length = item[size];
    }
    if(box){const size=vertical?box.clientHeight:box.clientWidth,max=(vertical?box.scrollHeight:box.scrollWidth)-size,offset=vertical?box.scrollTop:Math.abs(box.scrollLeft);const start=offset<=1,end=offset>=max-1;setEdges(old=>old.start===start&&old.end===end?old:{start,end});}
    setBounds((old) =>
      old[axis] === offset && old[size] === length ? old : { [axis]: offset, [size]: length },
    );
  }, [vertical, rtl]);
  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);
  React.useLayoutEffect(()=>{
    const box=scroller.current,tab=list.current?.querySelector('[role="tab"][aria-selected="true"]');
    if(scrollable&&box&&tab){const viewport=box.getBoundingClientRect(),item=tab.getBoundingClientRect(),start=vertical?'top':'left',end=vertical?'bottom':'right';const delta=item[start]<viewport[start]?item[start]-viewport[start]:item[end]>viewport[end]?item[end]-viewport[end]:0;if(delta)box[vertical?'scrollTop':'scrollLeft']+=delta;}
    measure();
  }, [measure, value, children,scrollable]);
  React.useImperativeHandle(action,()=>({updateIndicator:measure,updateScrollButtons:measure}),[measure]);
  React.useEffect(() => {
    const group = list.current,
      win = group.ownerDocument.defaultView;
    const resize = win.ResizeObserver && new win.ResizeObserver(measure);
    function observe() {
      resize?.disconnect();
      resize?.observe(scroller.current);
      for (const tab of group.children) resize?.observe(tab);
      measure();
    }
    const mutations = win.MutationObserver && new win.MutationObserver(observe);
    mutations?.observe(group, { childList: true });
    observe();
    win.addEventListener("resize", measure);
    return () => {
      resize?.disconnect();
      mutations?.disconnect();
      win.removeEventListener("resize", measure);
    };
  }, [measure]);
  // SSR places the indicator inside its tab. After hydration it can be measured
  // and moved independently as a sibling of the list.
  const indicator = h(Indicator, { ownerState: state, className: cls("indicator"), style: bounds });
  let index = 0;
  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return null;
    const position = index++,
      id = child.props.value === undefined ? position : child.props.value,
      selected = id === value;
    return React.cloneElement(child, {
      value: id,
      selected,
      onChange,
      textColor,
      selectionFollowsFocus,
      fullWidth: variant === "fullWidth",
      indicator: !mounted && selected ? indicator : undefined,
      ...(value === false &&
        position === 0 &&
        mounted &&
        child.props.tabIndex === undefined && { tabIndex: 0 }),
    });
  });
  const arrow=(back)=>{
    if(!scrollable||scrollButtons===false||scrollButtons==='auto'&&edges.start&&edges.end)return null;
    const disabled=back?edges.start:edges.end;
    return h(ScrollButton,{type:'button',tabIndex:-1,disabled,ownerState:{...state,allowScrollButtonsMobile},className:join(cls('scrollButtons'),!allowScrollButtonsMobile&&cls('scrollButtonsHideMobile')),'aria-label':vertical?(back?'scroll up':'scroll down'):(back?'scroll left':'scroll right'),onClick:()=>{
      const box=scroller.current,axis=vertical?'scrollTop':'scrollLeft',amount=(vertical?box.clientHeight:box.clientWidth)*(back?-1:1)*(rtl&&!vertical?-1:1);box[axis]+=amount;measure();
    }},vertical?(back?'↑':'↓'):(back?'‹':'›'));
  };
  return h(
    Root,
    {
      ...root,
      ref,
      as: component,
      ownerState: state,
      className: join(cls("root"), vertical && cls("vertical"), className),
    },
    arrow(true),
    h(
      Scroller,
      {
        ref: scroller,
        ownerState: state,
        onScroll: measure,
        style: { ...(scrollable?{overflowX:vertical?"hidden":"auto",overflowY:vertical?"auto":"hidden",scrollbarWidth:!visibleScrollbar?"none":undefined}:{overflow:"hidden"}), [vertical ? (rtl ? "marginLeft" : "marginRight") : "marginBottom"]: 0 },
        className: join(cls("scroller"),cls(scrollable?(vertical?"scrollableY":"scrollableX"):"fixed"),scrollable&&!visibleScrollbar&&cls("hideScrollbar")),
      },
      h(
        List,
        {
          ref: list,
          ownerState: state,
          role: "tablist",
          "aria-label": label,
          "aria-labelledby": labelled,
          "aria-orientation": vertical ? "vertical" : undefined,
          className: join(cls("list"), vertical && cls("vertical"), centered && cls("centered")),
          onKeyDown: (event) => navigate(event, vertical, rtl),
        },
        items,
      ),
      mounted && indicator,
    ),
    arrow(false),
  );
});
module.exports = { Tab, Tabs, tabClasses, tabsClasses, getTabUtilityClass, getTabsUtilityClass };

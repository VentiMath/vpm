const React = require("react"),
  { createRoot } = require("react-dom/client");
const Autowhatever = require("react-autosuggest/dist/Autowhatever").default;
module.exports = function setup(variant) {
  const host = document.createElement("section");
  document.body.append(host);
  window.sectionControls ??= {};
  window.sectionStates ??= {};
  function Harness() {
    const [config, setConfig] = React.useState({
      multiSection: false,
      items: [],
    });
    const [position, setPosition] = React.useState([null, null]);
    const events = React.useRef([]);
    window.sectionStates[variant] = { position, events: events.current };
    window.sectionControls[variant] = {
      reset(counts, multiSection) {
        events.current = [];
        setPosition([null, null]);
        setConfig({
          multiSection,
          items: multiSection
            ? counts.map((n) => ({
                items: Array.from({ length: n }, (_, i) => String(i)),
              }))
            : Array.from({ length: counts }, (_, i) => String(i)),
        });
      },
    };
    return React.createElement(Autowhatever, {
      ...config,
      id: variant,
      getSectionItems: (s) => s.items,
      renderSectionTitle: () => null,
      renderItem: (x) => React.createElement("span", null, x),
      highlightedSectionIndex: position[0],
      highlightedItemIndex: position[1],
      inputProps: {
        id: variant,
        value: "",
        onChange() {},
        onKeyDown(e, data) {
          events.current.push({
            keyCode: e.keyCode,
            trusted: e.nativeEvent.isTrusted,
          });
          if (e.keyCode === 40 || e.keyCode === 38) {
            e.preventDefault();
            setPosition([
              data.newHighlightedSectionIndex,
              data.newHighlightedItemIndex,
            ]);
          }
        },
      },
    });
  }
  createRoot(host).render(React.createElement(Harness));
};

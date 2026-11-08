# vtanstack-react-virtual

Independent React 19 adapter targeting **@tanstack/react-virtual 3.14.26**,
with **3.11.2** as the application control. Depends on VPM's
[virtual core](../vtanstack-virtual-core); React and React DOM are peers.

```jsx
import { useVirtualizer } from "vtanstack-react-virtual";

function Rows({ rows, viewport }) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewport.current,
    estimateSize: () => 37,
    getItemKey: (index) => rows[index].id,
  });
  return (
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {virtualizer.getVirtualItems().map((item) => (
        <div
          key={item.key}
          data-index={item.index}
          ref={virtualizer.measureElement}
          style={{
            position: "absolute",
            width: "100%",
            transform: `translateY(${item.start}px)`,
          }}
        >
          {rows[item.index].label}
        </div>
      ))}
    </div>
  );
}
```

`useVirtualizer` supplies element observers and scrolling. `useWindowVirtualizer`
supplies window observers, the window getter and initial window offset. Both
return a stable virtualizer and re-export the core's public runtime and types.
Use `initialRect` and `initialOffset` for deterministic server markup.

Scrolling notifications flush React synchronously by default; `useFlushSync:
false` lets React batch them. User callbacks and that flush policy are published
at commit time, so a suspended, abandoned render cannot replace the live handler.
Core options still update during render, as in upstream; this is not a claim of
complete concurrent-state isolation. Setup notifications avoid calling
`flushSync` from a layout effect, and callbacks after disposal are suppressed.
StrictMode remounts reattach observers.

## Scope

React owns item/container markup and styles. `containerRef` is a harmless no-op
in this mode. **`directDomUpdates: true` throws**; direct positioning without React
renders is outside the table contract. The core supports single-lane,
start-anchored rows/columns, including dynamic sizing, RTL elements and window
scrolling. Masonry, end-anchored feeds and iOS momentum correction are excluded.
React 19.1 and 19.2 are tested; older React versions are not supported.

The unchanged Material React Table 3.2.1 row/column hooks are test consumers.
VentiMath uses MRT through its shared DataTable, but inspected app call sites do
not explicitly enable virtualization. This is dependency completion, not a
claim of production adoption. A consumer release and app cutover are separate.

[Conformance](../../scripts/react-virtual-conformance/README.md) ·
[Benchmarks](bench/results/README.md) · [Provenance](PROVENANCE.json)

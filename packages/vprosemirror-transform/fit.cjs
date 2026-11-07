"use strict";
const { Fragment, Slice } = require("vprosemirror-model");
const { ReplaceStep, ReplaceAroundStep } = require("./steps.cjs");
// Assemble a document from persistent subtrees and boundary events. Fitting is
// driven by each schema's content automaton; input wrappers can be opened only
// when no enclosing position can accept them.
function events(fragment, from, to, out) {
  let at = 0;
  fragment.forEach((n) => {
    const end = at + n.nodeSize;
    if (end > from && at < to) {
      if (from <= at && to >= end) out.push({ node: n });
      else if (n.isText)
        out.push({
          node: n.cut(Math.max(0, from - at), Math.min(n.nodeSize, to - at)),
        });
      else {
        if (from <= at) out.push({ open: n });
        events(
          n.content,
          Math.max(0, from - at - 1),
          Math.min(n.content.size, to - at - 1),
          out,
        );
        if (to >= end) out.push({ close: n });
      }
    }
    at = end;
  });
  return out;
}
function fitDocument(doc, from, to, slice) {
  const a = doc.resolve(from),
    b = doc.resolve(to),
    stack = [],
    contexts = [];
  const frame = (node, content = Fragment.empty) => ({
    node,
    content,
    match: node.type.contentMatch.matchFragment(content),
  });
  for (let d = 0; d <= a.depth; d++)
    stack.push(
      frame(
        a.node(d),
        a
          .node(d)
          .content.cut(
            0,
            d === a.depth ? a.parentOffset : a.before(d + 1) - a.start(d),
          ),
      ),
    );
  function push(node) {
    const f = stack.at(-1),
      m = f.match?.matchType(node.type);
    if (!m) return false;
    f.content = f.content.append(
      Fragment.from(node.mark(f.node.type.allowedMarks(node.marks))),
    );
    f.match = m;
    return true;
  }
  function close() {
    if (stack.length === 1) return false;
    const f = stack.at(-1),
      fill = f.match?.fillBefore(Fragment.empty, true);
    if (!fill) return false;
    const n = f.node.copy(f.content.append(fill));
    stack.pop();
    return push(n);
  }
  function pathFor(n) {
    for (let d = stack.length - 1; d >= 0; d--) {
      const f = stack[d],
        state =
          d === stack.length - 1
            ? f.match
            : f.match?.matchType(stack[d + 1].node.type);
      if (state?.matchType(n.type)) return { depth: d };
      const fill = state?.fillBefore(Fragment.from(n), false);
      if (fill) return { depth: d, fill };
      const wrap = state?.findWrapping(n.type);
      if (wrap) return { depth: d, wrap };
      if (
        d &&
        (!f.match?.fillBefore(Fragment.empty, true) ||
          f.node.type.spec.isolating)
      )
        break;
    }
    return null;
  }
  function place(n, opened = false) {
    let path = pathFor(n);
    if (!path && opened) {
      for (const context of contexts) {
        if (context.type === n.type) continue;
        const outer = pathFor(context);
        if (
          outer &&
          context.type.contentMatch.fillBefore(Fragment.from(n), false)
        ) {
          place(context, true);
          path = pathFor(n);
          break;
        }
      }
    }
    if (!path) {
      if (!n.isLeaf && !n.content.size) {
        while (stack.length > 1) if (!close()) break;
        return false;
      }
      if (!n.isLeaf && !n.type.spec.isolating) {
        n.content.forEach((child) => place(child));
        return true;
      }
      return false;
    }
    while (stack.length - 1 > path.depth) if (!close()) return false;
    if (path.fill) path.fill.forEach(push);
    if (path.wrap)
      for (const type of path.wrap) stack.push(frame(type.create()));
    if (opened) stack.push(frame(n));
    else if (!n.type.validContent(n.content) && !n.isText) {
      const fill = n.type.createAndFill(n.attrs, n.content, n.marks);
      if (fill) push(fill);
      else {
        stack.push(frame(n));
        n.content.forEach((child) => place(child));
        close();
      }
    } else push(n);
    if (!opened && !n.isInline && path.wrap)
      for (let i = 0; i < path.wrap.length; i++) if (!close()) return false;
    return true;
  }
  // The open-left context is an instruction to join existing parents, not to
  // recreate them. Remaining close events finish those joined parents.
  let open = slice.openStart;
  if (slice.openEnd < open) {
    let n = slice.content.firstChild;
    for (let d = 0; n && d < open; d++, n = n.firstChild)
      if (n.type.spec.isolating) {
        open = d;
        break;
      }
  }
  for (
    let n = slice.content.firstChild, d = 0;
    n && d < open;
    d++, n = n.firstChild
  )
    contexts.push(n);
  const deepest = contexts.at(-1),
    current = stack.at(-1).node;
  const initial = events(
    slice.content,
    open,
    slice.content.size - slice.openEnd,
    [],
  )[0];
  const directChild =
    (initial?.node || initial?.open) &&
    stack.at(-1).match?.matchType((initial.node || initial.open).type);
  if (
    deepest &&
    initial?.close !== deepest &&
    !directChild &&
    !(
      current.type === deepest.type ||
      (current.isTextblock && deepest.isTextblock)
    )
  ) {
    for (let i = contexts.length - 1; i >= 0; i--) {
      const context = contexts[i],
        path = pathFor(context);
      if (path) {
        place(context, true);
        for (let j = i + 1; j < contexts.length; j++) place(contexts[j], true);
        break;
      }
    }
  }
  const input = events(
    slice.content,
    open,
    slice.content.size - slice.openEnd,
    [],
  );
  for (let i = 0; i < input.length; i++) {
    const t = input[i];
    if (t.node) place(t.node);
    else if (t.open) place(t.open, true);
    else {
      let d = stack.length - 1;
      while (
        d > 0 &&
        !(
          stack[d].node.type === t.close.type ||
          (stack[d].node.isTextblock && t.close.isTextblock)
        )
      )
        d--;
      const original =
        d > 0 &&
        Array.from({ length: b.depth }, (_, j) => b.node(j + 1)).includes(
          stack[d].node,
        );
      if (d > 0 && !(i === input.length - 1 && original))
        while (stack.length - 1 >= d) if (!close()) break;
    }
  }
  let carry = Fragment.empty;
  for (let d = b.depth; d >= 0; d--) {
    const original = b.node(d),
      offset = d === b.depth ? b.parentOffset : b.after(d + 1) - b.start(d),
      rest = carry.append(original.content.cut(offset));
    if (!rest.size && d > 0) {
      carry = Fragment.empty;
      continue;
    }
    let match = -1,
      filler = null;
    // Sibling suffixes stay at their original nesting level. Only a suffix
    // already carried as a whole subtree may join a shallower compatible frame.
    // This also lets ordered/bullet lists share a surviving list-item boundary.
    for (let k = d === 0 ? 0 : stack.length - 1; k >= 0; k--) {
      const f = stack[k];
      if (
        !(d === 0
          ? k === 0
          : k > 0 &&
            (((k >= d || carry.size) &&
              f.node.type.compatibleContent(original.type)) ||
              (d === b.depth && f.node.isTextblock && original.isTextblock)))
      )
        continue;
      let pending = null,
        valid = true;
      for (let j = stack.length - 1; j > k; j--) {
        const child = stack[j],
          content = pending
            ? child.content.append(Fragment.from(pending))
            : child.content;
        pending = child.node.type.createAndFill(
          child.node.attrs,
          content,
          child.node.marks,
        );
        if (!pending) {
          valid = false;
          break;
        }
      }
      const state = pending ? f.match?.matchType(pending.type) : f.match;
      const fill = state?.fillBefore(rest, false);
      if (
        valid &&
        fill &&
        rest.content.every((n) => f.node.type.allowsMarks(n.marks))
      ) {
        match = k;
        filler = fill;
        break;
      }
    }
    if (match >= 0) {
      while (stack.length - 1 > match) if (!close()) return null;
      for (const n of filler.append(rest).content) if (!push(n)) return null;
      carry = Fragment.empty;
      if (d > 0 && stack.length > 1) if (!close()) return null;
    } else if (d > 0) {
      const full = original.type.createAndFill(
        original.attrs,
        rest,
        original.marks,
      );
      if (!full) return null;
      carry = Fragment.from(full);
    } else return null;
  }
  while (stack.length > 1) if (!close()) return null;
  const root = stack[0],
    fill = root.match?.fillBefore(Fragment.empty, true);
  return fill ? doc.copy(root.content.append(fill)) : null;
}
function replaceStep(doc, from, to = from, slice = Slice.empty) {
  if (from === to && !slice.size) return null;
  const direct = new ReplaceStep(from, to, slice);
  // A closed block fragment pasted into one textblock only splits that block.
  // Build the two open boundary shells directly and let the model validate the
  // complete replacement; complex schemas still fall through to general fitting.
  if (
    !slice.openStart &&
    !slice.openEnd &&
    slice.content.childCount &&
    slice.content.content.every((n) => n.isBlock)
  ) {
    const left = doc.resolve(from),
      right = doc.resolve(to);
    if (
      left.sameParent(right) &&
      left.parent.isTextblock &&
      !left.parent.type.spec.isolating
    ) {
      const shell = left.parent.copy(Fragment.empty);
      const split = new ReplaceStep(
        from,
        to,
        new Slice(
          Fragment.from(shell).append(slice.content).addToEnd(shell),
          1,
          1,
        ),
      );
      if (!split.apply(doc).failed) return split;
    }
  }
  if (!direct.apply(doc).failed) return direct;
  const result = fitDocument(doc, from, to, slice);
  if (!result) return null;
  if (result.eq(doc))
    return slice.size ? new ReplaceStep(from, to, doc.slice(from, to)) : null;
  // Keep the edit's specified boundaries where possible so positions outside
  // the replaced range retain their identity, including identical inserted text.
  let start = from,
    end = to,
    newEnd = to + result.content.size - doc.content.size;
  for (let d = doc.resolve(from).depth; d >= 0; d--) {
    if (d < doc.resolve(from).depth) start = doc.resolve(from).before(d + 1);
    for (let e = doc.resolve(to).depth; e >= 0; e--) {
      end = e === doc.resolve(to).depth ? to : doc.resolve(to).after(e + 1);
      newEnd = end + result.content.size - doc.content.size;
      if (newEnd < start) continue;
      const replacement = result.slice(start, newEnd);
      if (end > to && doc.resolve(to).parent.isTextblock) {
        const gapTo = doc.resolve(to).end(),
          gap = doc.slice(to, gapTo);
        // An empty surviving text tail still anchors the insertion cursor.
        // Closing additional list shells must not move that cursor after them.
        if (
          !gap.size &&
          !slice.openStart &&
          !slice.openEnd &&
          slice.content.content.every((n) => n.isInline) &&
          doc.resolve(from).parent.inlineContent
        ) {
          const insert = from - start + slice.size;
          if (insert >= 0 && insert <= replacement.size) {
            const around = new ReplaceAroundStep(
              start,
              end,
              to,
              gapTo,
              replacement,
              insert,
            );
            if (around.apply(doc).doc?.eq(result)) return around;
          }
        }
        if (gap.size) {
          for (
            let insert = 0;
            insert + gap.size <= replacement.size;
            insert++
          ) {
            try {
              const found = result.slice(
                start + insert,
                start + insert + gap.size,
              );
              if (!found.eq(gap)) continue;
              const around = new ReplaceAroundStep(
                start,
                end,
                to,
                gapTo,
                replacement.removeBetween(insert, insert + gap.size),
                insert,
              );
              if (around.apply(doc).doc?.eq(result)) return around;
            } catch {}
          }
        }
      }
      const step = new ReplaceStep(start, end, replacement);
      try {
        const applied = step.apply(doc);
        if (applied.doc?.eq(result)) return step;
      } catch {}
    }
  }
  return new ReplaceStep(0, doc.content.size, new Slice(result.content, 0, 0));
}
module.exports = { replaceStep };

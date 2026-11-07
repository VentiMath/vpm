"use strict";
module.exports = function run(H, Schema, EditorState, Rope) {
  const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "text*" },
        text: {},
      },
      marks: { strong: {} },
    }),
    plugin = H.history({ depth: 80, newGroupDelay: 500 });
  let state = EditorState.create({ schema, plugins: [plugin] }),
    time = 0;
  const snapshots = [];
  const dispatch = (tr) => {
    state = state.apply(tr);
  };
  const record = () => {
    if (!(plugin.getState(state).done.items instanceof Rope))
      throw Error("History did not use expected sequence");
    snapshots.push([
      state.doc.toJSON(),
      state.selection.toJSON(),
      H.undoDepth(state),
      H.redoDepth(state),
    ]);
  };
  const edit = (text, group = true, track = true) => {
    let tr = state.tr.insertText(text, 1).setTime((time += 1000));
    if (group) tr = H.closeHistory(tr);
    if (!track) tr.setMeta("addToHistory", false);
    dispatch(tr);
    record();
  };
  edit("alpha");
  edit(" beta");
  H.undo(state, dispatch);
  if (state.doc.textContent !== "alpha")
    throw Error("Undo did not restore first edit");
  record();
  H.redo(state, dispatch);
  if (state.doc.textContent !== " betaalpha")
    throw Error("Redo did not restore second edit");
  record();
  edit("untracked", true, false);
  H.undo(state, dispatch);
  record();
  H.redo(state, dispatch);
  record();
  for (let i = 0; i < 240; i++) edit(String(i % 10));
  for (let i = 0; i < 90; i++) {
    H.undo(state, dispatch);
    record();
  }
  for (let i = 0; i < 90; i++) {
    H.redo(state, dispatch);
    record();
  }
  for (let i = 0; i < 1200; i++) {
    dispatch(state.tr.insertText("x", 1).setMeta("addToHistory", false));
  }
  H.undo(state, dispatch);
  record();
  H.redo(state, dispatch);
  record();
  H.undo(state, dispatch);
  edit("branch");
  if (H.redoDepth(state) !== 0) throw Error("Redo branch survived");
  const before = state.doc.toJSON();
  for (let i = 0; i < 5; i++)
    dispatch(state.tr.insertText("z", 1).setTime(time + 10 + i));
  record();
  H.undo(state, dispatch);
  record();
  H.redo(state, dispatch);
  record();
  if (!before.content) throw Error("No document");
  return snapshots;
};

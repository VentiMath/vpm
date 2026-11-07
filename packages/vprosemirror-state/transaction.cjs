"use strict";
const { Transform } = require("vprosemirror-transform"),
  { Mark } = require("vprosemirror-model");
const { Selection } = require("./selection.cjs");
class Transaction extends Transform {
  constructor(state) {
    super(state.doc);
    this.time = Date.now();
    this.storedMarks = state.storedMarks;
    this._selection = state.selection;
    this._selectionStep = 0;
    this._selectionSet = false;
    this._marksSet = false;
    this._scroll = false;
    this.meta = Object.create(null);
  }
  get selection() {
    if (this._selectionStep !== this.steps.length) {
      this._selection = this._selection.map(
        this.doc,
        this.mapping.slice(this._selectionStep),
      );
      this._selectionStep = this.steps.length;
    }
    return this._selection;
  }
  setSelection(selection) {
    if (selection.$from.doc !== this.doc)
      throw new RangeError("Selection must refer to the transaction document");
    this._selection = selection;
    this._selectionStep = this.steps.length;
    this._selectionSet = true;
    this.storedMarks = null;
    this._marksSet = false;
    return this;
  }
  get selectionSet() {
    return this._selectionSet;
  }
  setStoredMarks(marks) {
    this.storedMarks = marks;
    this._marksSet = true;
    return this;
  }
  ensureMarks(marks) {
    if (!Mark.sameSet(this.storedMarks || this.selection.$from.marks(), marks))
      this.setStoredMarks(marks);
    return this;
  }
  addStoredMark(mark) {
    return this.ensureMarks(
      mark.addToSet(this.storedMarks || this.selection.$head.marks()),
    );
  }
  removeStoredMark(mark) {
    return this.ensureMarks(
      mark.removeFromSet(this.storedMarks || this.selection.$head.marks()),
    );
  }
  get storedMarksSet() {
    return this._marksSet;
  }
  addStep(step, doc) {
    super.addStep(step, doc);
    this.storedMarks = null;
    this._marksSet = false;
  }
  setTime(time) {
    this.time = time;
    return this;
  }
  replaceSelection(slice) {
    this.selection.replace(this, slice);
    return this;
  }
  replaceSelectionWith(node, inheritMarks = true) {
    const s = this.selection;
    if (inheritMarks && node.isInline)
      node = node.mark(
        this.storedMarks ||
          (s.empty ? s.$from.marks() : s.$from.marksAcross(s.$to)) ||
          Mark.none,
      );
    s.replaceWith(this, node);
    return this;
  }
  deleteSelection() {
    this.selection.replace(this);
    return this;
  }
  insertText(text, from, to = from) {
    if (from === undefined)
      return text
        ? this.replaceSelectionWith(this.doc.type.schema.text(text), true)
        : this.deleteSelection();
    if (!text) return this.deleteRange(from, to);
    const a = this.doc.resolve(from),
      b = this.doc.resolve(to),
      marks =
        this.storedMarks ||
        (from === to ? a.marks() : a.marksAcross(b)) ||
        Mark.none;
    this.replaceRangeWith(from, to, this.doc.type.schema.text(text, marks));
    if (!this.selection.empty && this.selection.to === from + text.length)
      this.setSelection(Selection.near(this.selection.$to));
    return this;
  }
  setMeta(key, value) {
    this.meta[typeof key === "string" ? key : key.key] = value;
    return this;
  }
  getMeta(key) {
    return this.meta[typeof key === "string" ? key : key.key];
  }
  get isGeneric() {
    return Object.keys(this.meta).length === 0;
  }
  scrollIntoView() {
    this._scroll = true;
    return this;
  }
  get scrolledIntoView() {
    return this._scroll;
  }
}
module.exports = { Transaction };

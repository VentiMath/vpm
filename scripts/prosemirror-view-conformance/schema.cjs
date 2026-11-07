// Official extensions and configuration used by VentiMath's documentation
// editor. ImageUpload's React node view is deliberately outside this milestone.
const { getSchema } = require("@tiptap/core");
const { StarterKit } = require("@tiptap/starter-kit");
const { Highlight } = require("@tiptap/extension-highlight");
const { Image } = require("@tiptap/extension-image");
const { Subscript } = require("@tiptap/extension-subscript");
const { Superscript } = require("@tiptap/extension-superscript");
const { TaskItem } = require("@tiptap/extension-task-item");
const { TaskList } = require("@tiptap/extension-task-list");
const { TextAlign } = require("@tiptap/extension-text-align");
const { Typography } = require("@tiptap/extension-typography");
const { Underline } = require("@tiptap/extension-underline");
const { Link } = require("@tiptap/extension-link");
exports.schema = getSchema([
  StarterKit,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Underline,
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Image,
  Typography,
  Superscript,
  Subscript,
  Link.extend({ inclusive: false }).configure({ openOnClick: false }),
]);

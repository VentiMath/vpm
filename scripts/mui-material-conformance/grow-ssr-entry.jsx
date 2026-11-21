import { renderToString } from "react-dom/server";
import Grow from "@grow";
import {scene} from "./grow-scene.jsx";
export function render(props) {
  return renderToString(scene(props));
}
export function prepare(kind) {
  const tree = scene({ in: kind === "open", appear: false });
  return () => renderToString(tree);
}
export function hydrate() {
  return render({ in: false });
}
export const supportsAuto = Grow.muiSupportAuto;

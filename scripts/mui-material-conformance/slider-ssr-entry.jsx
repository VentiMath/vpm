import { renderToString } from "react-dom/server";
import { scene } from "./slider-scene.jsx";
export const render = (props) => renderToString(scene(props));
export const hydrate = () => render({ value: 16 });

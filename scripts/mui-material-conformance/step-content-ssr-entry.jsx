import { renderToString } from "react-dom/server";
import { scene } from "./step-content-scene.jsx";
export const render = (p) => renderToString(scene(p));
export const hydrate = () => render({});

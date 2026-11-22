import { renderToString } from "react-dom/server";
import { scene } from "./steps-scene.jsx";
export const render = (props) => renderToString(scene(props));
export const hydrate = () => render({});

import { renderToString } from "react-dom/server";
import { scene } from "./list-item-scene.jsx";
export const render = (props) => renderToString(scene(props));
export const hydrate = () => render({});

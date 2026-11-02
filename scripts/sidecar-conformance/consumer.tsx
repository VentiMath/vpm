import * as React from 'react';
import {createMedium, createSidecarMedium, exportSidecar, sidecar, useSidecar, renderCar, setConfig, type SideCarComponent} from 'vuse-sidecar';
const numbers = createMedium(1, (value, assigned) => value + Number(assigned));
numbers.useMedium(2)();
// @ts-expect-error numeric medium
numbers.useMedium('no');
const medium = createSidecarMedium<{text:string}>({async:false});
const Effect = ({text}:{text:string}) => <span>{text}</span>;
const Export: SideCarComponent<{text:string}> = exportSidecar(medium, Effect);
const importer = async () => ({default:Effect});
const Lazy = sidecar(importer,<span>failed</span>);
const valid = <Lazy sideCar={medium} text="ok"/>;
// @ts-expect-error required caller prop
const missing = <Lazy sideCar={medium}/>;
// @ts-expect-error component props incompatible with medium
exportSidecar(createSidecarMedium(), Effect);
function Hook() {const [Component,error] = useSidecar(importer,medium); return Component ? <Component text="ok"/> : error?.message;}
function Source({x,children}:{x:number;children:(value:number)=>React.ReactNode}) {return children(x);}
const Bridge = renderCar(Source,(props:{x:number}):[number] => [props.x]);
const bridged = <Bridge x={1}>{value => <span>{value.toFixed(0)}</span>}</Bridge>;
setConfig({onError:error => {const message:string=error.message; void message;}});
void [Export,valid,missing,Hook,bridged];

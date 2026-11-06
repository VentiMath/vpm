import * as React from 'react';import * as P from '@radix-ui/react-dropdown-menu';const content:P.DropdownMenuContentProps={loop:true,side:'bottom',onCloseAutoFocus:e=>e.preventDefault(),onEscapeKeyDown:e=>{const k:KeyboardEvent=e;},onPointerDownOutside:e=>{const p:PointerEvent=e.detail.originalEvent;}};const tree=<P.Root open dir="rtl" onOpenChange={open=>{const b:boolean=open;}}><P.Trigger asChild><button/></P.Trigger><P.Portal container={document.body}><P.Content {...content} ref={React.createRef<HTMLDivElement>()}><P.Label>label</P.Label><P.Group><P.Item textValue="item" onSelect={e=>{const n:Event=e;e.preventDefault();}}>item</P.Item></P.Group><P.CheckboxItem checked="indeterminate" onCheckedChange={checked=>{const b:boolean=checked;}}><P.ItemIndicator/></P.CheckboxItem><P.RadioGroup value="one" onValueChange={value=>{const s:string=value;}}><P.RadioItem value="one"/></P.RadioGroup><P.Sub><P.SubTrigger>more</P.SubTrigger><P.SubContent align="end"/></P.Sub><P.Separator/><P.Arrow ref={React.createRef<SVGSVGElement>()}/></P.Content></P.Portal></P.Root>;
// @ts-expect-error invalid checked state
const badChecked=<P.CheckboxItem checked="mixed"/>;
// @ts-expect-error submenu has only start/end alignment
const badAlign=<P.SubContent align="center"/>;
// @ts-expect-error radio item requires a value
const badRadio=<P.RadioItem/>;
// @ts-expect-error forceMount only accepts true
const badMount=<P.Content forceMount={false}/>;
// @ts-expect-error caller chooses sub side through direction
const badSide=<P.SubContent side="bottom"/>;void tree;

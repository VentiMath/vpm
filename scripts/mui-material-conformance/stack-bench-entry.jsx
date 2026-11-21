import React from 'react';
import {renderToString} from 'react-dom/server';
import {ContestStack} from './stack-scene.jsx';
export function prepare(kind,modern) {
  const panel = Array.from({length:8},(_,i)=><ContestStack key={i} kind={kind} modern={modern}/>);
  return () => renderToString(<>{panel}</>);
}

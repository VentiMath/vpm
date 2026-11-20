import React from 'react';
import {renderToString} from 'react-dom/server';
import {Notice} from './snackbar-scene.jsx';
export function prepare(kind) {
  const notices = Array.from({length:8}, (_, i) => <Notice key={i} open={kind === 'open'}/>);
  return () => renderToString(<>{notices}</>);
}

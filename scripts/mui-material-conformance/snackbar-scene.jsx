import React from 'react';
import { Snackbar } from '@buttons';
export function Notice({open = true, action, custom, ...props}) {
  return <Snackbar open={open} message="Link copied to clipboard"
    action={action && <button>Undo</button>} autoHideDuration={2000} {...props}>
    {custom ? <div role="status">Copied</div> : undefined}
  </Snackbar>;
}
export function HydrationScene() { return <Notice />; }

'use strict';
// vfirebase-admin omits the Realtime Database client: upstream's entry point
// wraps @firebase/database-compat and its websocket stack (13 packages), which
// no VPM caller uses. Importing it fails here instead of at first use.
throw new Error('vfirebase-admin does not include the Realtime Database client (firebase-admin/database). ' +
    'Use Cloud Firestore, or the original firebase-admin package for Realtime Database access.');

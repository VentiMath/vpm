import type * as React from 'react';
export interface PresenceProps { present: boolean; children: React.ReactElement | ((state: {present:boolean}) => React.ReactElement); }
export declare const Presence: React.FC<PresenceProps>;
export {Presence as Root};

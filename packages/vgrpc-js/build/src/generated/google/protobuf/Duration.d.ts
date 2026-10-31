import type { Long } from 'vgrpc-proto-loader';
export interface Duration {
    'seconds'?: (number | string | Long);
    'nanos'?: (number);
}
export interface Duration__Output {
    'seconds': (string);
    'nanos': (number);
}

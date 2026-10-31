import type {Buffer} from '../../../platform';
import type { AnyExtension } from 'vgrpc-proto-loader';
export type Any = AnyExtension | {
    type_url: string;
    value: Buffer | Uint8Array | string;
};
export interface Any__Output {
    'type_url': (string);
    'value': (Buffer);
}

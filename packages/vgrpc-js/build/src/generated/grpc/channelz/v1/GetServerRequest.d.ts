import type { Long } from 'vgrpc-proto-loader';
export interface GetServerRequest {
    /**
     * server_id is the identifier of the specific server to get.
     */
    'server_id'?: (number | string | Long);
}
export interface GetServerRequest__Output {
    /**
     * server_id is the identifier of the specific server to get.
     */
    'server_id': (string);
}

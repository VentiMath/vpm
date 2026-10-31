import type { Long } from 'vgrpc-proto-loader';
export interface GetChannelRequest {
    /**
     * channel_id is the identifier of the specific channel to get.
     */
    'channel_id'?: (number | string | Long);
}
export interface GetChannelRequest__Output {
    /**
     * channel_id is the identifier of the specific channel to get.
     */
    'channel_id': (string);
}

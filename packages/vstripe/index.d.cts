import {Stripe as Client} from './index.js';
declare const Stripe: typeof Client & {readonly Stripe: typeof Client; readonly default: typeof Client};
declare namespace Stripe {
  type StripeConfig = import('./index.js').StripeConfig;
  type RequestOptions = import('./index.js').RequestOptions;
  type SessionCreateParams = import('./index.js').SessionCreateParams;
  type Session = import('./index.js').Session;
  type StripeEvent<T = import('./index.js').Session> = import('./index.js').StripeEvent<T>;
  type LastResponse = import('./index.js').LastResponse;
  type RawBody = import('./index.js').RawBody;
  type Webhooks = import('./index.js').Webhooks;
}
export = Stripe;

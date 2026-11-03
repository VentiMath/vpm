import Stripe, {type SessionCreateParams, type StripeEvent} from 'vstripe';
import {Buffer} from 'node:buffer';
const stripe = new Stripe('sk_test_fixture');
const params: SessionCreateParams = {
  mode: 'payment',
  line_items: [{price_data: {currency: 'usd', product_data: {name: 'Lesson'}, unit_amount: 2500}, quantity: 1}],
  metadata: {userId: 'fixture'},
};
const result = stripe.checkout.sessions.create(params, {idempotencyKey: 'order', signal: new AbortController().signal});
result.then(session => { const url: string | null = session.url; return url; });
const event: StripeEvent = stripe.webhooks.constructEvent(Buffer.from('{}'), 't=1,v1=00', 'whsec_fixture');
const paymentId: string = event.data.object.id;
// @ts-expect-error unsupported mode
stripe.checkout.sessions.create({mode: 'payments'});
// @ts-expect-error parsed JSON is not a raw webhook body
stripe.webhooks.constructEvent({}, 'header', 'secret');
// @ts-expect-error other Stripe resources are outside this scope
stripe.customers.create({});
void paymentId;

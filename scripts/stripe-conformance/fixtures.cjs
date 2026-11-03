'use strict';
// Synthetic values exercise the app's parameter and event shapes; no customer data.
exports.params={payment_method_types:['card'],line_items:[{price_data:{currency:'usd',product_data:{name:'Fixture – Lesson',description:'A & B / 例'},unit_amount:2500},quantity:1}],mode:'payment',success_url:'https://example.test/pay?status=success&session_id={CHECKOUT_SESSION_ID}',cancel_url:'https://example.test/pay?status=cancelled',metadata:{userId:'test-user',paymentOptionId:'lesson',paymentOptionName:'Lesson'}};
exports.session={id:'cs_test_fixture',object:'checkout.session',url:'https://checkout.stripe.com/test/fixture',payment_intent:'pi_fixture',metadata:exports.params.metadata,amount_total:2500,currency:'usd'};
exports.event={id:'evt_fixture',object:'event',type:'checkout.session.completed',data:{object:exports.session}};

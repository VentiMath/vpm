'use strict';
// The upstream suite's global-provider test registers through the 2.x Node SDK,
// which only accepts @opentelemetry/api < 1.10 (see run.cjs). This checks the
// same path with the OpenTelemetry SDK 3.0.0 pinned in the otel fixture, whose
// API range includes vopentelemetry-api's 1.10.0: Firestore must use the
// global provider and record its spans there.
const assert = require('node:assert/strict'), path = require('node:path');
const otel = path.resolve(__dirname, '../otel-conformance/node_modules');
const {TracerProvider, InMemorySpanExporter, SimpleSpanProcessor} = require(path.join(otel, '@opentelemetry/sdk-trace'));
const api = require('../../packages/vopentelemetry-api');
const {Firestore} = require('../../packages/vgoogle-cloud-firestore');
(async () => {
  const exporter = new InMemorySpanExporter();
  const provider = new TracerProvider({spanProcessors: [new SimpleSpanProcessor({exporter})]});
  assert.equal(api.trace.setGlobalTracerProvider(provider), true);
  const db = new Firestore({projectId: 'p'});
  assert.equal(db._traceUtil.tracerProvider.getDelegate(), provider);
  await db._traceUtil.startActiveSpan('Firestore.check', async span => { span.setAttributes({vpm: true}); });
  const spans = exporter.getFinishedSpans();
  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'Firestore.check');
  assert.equal(spans[0].instrumentationScope.name, 'vgoogle-cloud-firestore');
  assert.equal(spans[0].attributes['gcp.firestore.settings.project_id'], 'p');
  await db.terminate();
  console.log('Firestore tracing: the global OpenTelemetry SDK 3.0.0 provider is used and receives Firestore spans.');
})().catch(error => { console.error(error); process.exitCode = 1; });

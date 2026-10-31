import Firestore = require('..');
import {Firestore as NamedFirestore, FieldValue, Timestamp, type DocumentData, type QuerySnapshot} from '..';
import * as Pipelines from 'vgoogle-cloud-firestore/pipelines';

const db: Firestore.Firestore = new Firestore.Firestore({projectId: 'fixture'});
const named: NamedFirestore = new NamedFirestore({projectId: 'fixture', preferRest: true});
const reference: FirebaseFirestore.DocumentReference<DocumentData> = db.doc('users/ada');
async function calls(): Promise<void> {
  await reference.set({name: 'Ada', joined: Timestamp.now(), visits: FieldValue.increment(1)}, {merge: true});
  const snapshot: QuerySnapshot = await db.collection('users').where('name', '==', 'Ada').orderBy('joined').limit(10).get();
  for (const document of snapshot.docs) void document.data().name;
  await db.runTransaction(async transaction => { const read = await transaction.get(reference); transaction.update(reference, {visits: (read.get('visits') ?? 0) + 1}); });
  const stream: NodeJS.ReadableStream = db.collection('users').stream();
  for await (const item of db.collection('users').stream()) void item;
  const bundle: Buffer = db.bundle('b').add(snapshot.docs[0]!).build();
  const pipeline: Pipelines.Pipeline = db.pipeline().collection('users').where(Pipelines.field('visits').greaterThan(1));
  void [stream, bundle, pipeline];
}
void [named, calls];
// @ts-expect-error documents are paths, not numbers
db.doc(1);

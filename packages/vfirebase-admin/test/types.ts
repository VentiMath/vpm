import {Agent} from 'node:https';
import {initializeApp, cert, applicationDefault, getApps, type App} from 'vfirebase-admin/app';
import {getAuth, type DecodedIdToken} from 'vfirebase-admin/auth';
import {getFirestore, FieldValue, FieldPath, Timestamp, type DocumentReference, type Transaction} from 'vfirebase-admin/firestore';
import {getStorage} from 'vfirebase-admin/storage';
import {getMessaging, type BatchResponse} from 'vfirebase-admin/messaging';
import {SDK_VERSION} from 'vfirebase-admin';

const app: App = getApps()[0] ?? initializeApp({credential: applicationDefault(new Agent({keepAlive: true})), projectId: 'fixture'});
const other: App = initializeApp({credential: cert({projectId: 'fixture', clientEmail: 'a@example.com', privateKey: 'key'}, new Agent())}, 'other');
async function calls(token: string): Promise<void> {
  const decoded: DecodedIdToken = await getAuth(app).verifyIdToken(token, true);
  const db = getFirestore(app);
  const user: DocumentReference = db.collection('users').doc(decoded.uid);
  await user.set({seen: FieldValue.serverTimestamp(), at: Timestamp.now()}, {merge: true});
  await db.runTransaction(async (transaction: Transaction) => { transaction.update(user, new FieldPath('a', 'b'), 1); });
  const [url]: [string] = await getStorage(other).bucket('b').file('f.pdf').getSignedUrl({action: 'read', expires: Date.now() + 60000});
  const response: BatchResponse = await getMessaging(app).sendEachForMulticast({tokens: ['t'], notification: {title: 'Hi'}});
  void [url, response.successCount, SDK_VERSION];
}
void calls;
// @ts-expect-error the namespaced API (admin.firestore()) is not part of Admin 14
import('vfirebase-admin').then(admin => admin.firestore());

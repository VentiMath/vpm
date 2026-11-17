import * as api from '@idb';
import {exercise} from './cases.cjs';
import {initializeApp,deleteApp,_getProvider} from '@firebase/app';
import {getInstallations,getId,getToken} from '@firebase/installations';
window.runIDB=async()=>{
 const result=await exercise(api,'native-conformance');
 const app=initializeApp({appId:'1:123:web:fixture',apiKey:'synthetic-key',projectId:'vpm-fixture'},'vpm-idb-fixture');
 const calls=[];const saved=window.fetch;
 window.fetch=async(url,options)=>{const address=String(url);calls.push({url:address,method:options?.method});if(!address.startsWith('https://firebaseinstallations.googleapis.com/'))throw Error('Unexpected fixture request');return new Response(JSON.stringify(address.endsWith('authTokens:generate')?{token:'fixture-token',expiresIn:'604800s'}:{name:'projects/vpm-fixture/installations/caaaaaaaaaaaaaaaaaaaaa',fid:JSON.parse(options.body).fid,refreshToken:'fixture-refresh',authToken:{token:'fixture-token',expiresIn:'604800s'}}),{status:200,headers:{'content-type':'application/json'}});};
 try{
  const heartbeat=_getProvider(app,'heartbeat').getImmediate();await heartbeat.triggerHeartbeat();const header=await heartbeat.getHeartbeatsHeader();
  const installs=getInstallations(app);const fid=await getId(installs),token=await getToken(installs);const again=await getId(installs);
  const raw=await api.openDB('firebase-installations-database');const stored=await raw.get('firebase-installations-store','vpm-idb-fixture!1:123:web:fixture');raw.close();
  result.firebase={heartbeat:typeof header==='string'&&header.length>0,fidStable:fid===again,token,storedFIDMatches:stored.fid===again,storedToken:stored.authToken.token,networkCalls:calls.length};
 }finally{window.fetch=saved;await deleteApp(app);}
 const db=await api.openDB('native-recovery',1,{upgrade(db){db.createObjectStore('s')}});await db.put('s',1,'key');
 const tx=db.transaction('s','readwrite');const done=tx.done.then(()=> 'committed',e=>e.name);const request=api.unwrap(tx.store).add(2,'key');request.addEventListener('error',e=>e.preventDefault());try{await api.wrap(request)}catch{}await tx.store.put(3,'other');result.recovery={done:await done,value:await db.get('s','other')};db.close();await api.deleteDB('native-recovery');
 return result;
};

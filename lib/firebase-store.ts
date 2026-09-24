import { cert,getApps,initializeApp,type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseWebConfig } from './firebase-config';
import { initialData } from './domain';
import type { WorkspaceRow } from './workspace-store';

const appName='fiscaliza-server';

function serviceAccount():ServiceAccount|null{
 const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(raw){
  const value=JSON.parse(raw) as {project_id?:string;client_email?:string;private_key?:string};
  if(value.project_id&&value.client_email&&value.private_key)return {projectId:value.project_id,clientEmail:value.client_email,privateKey:value.private_key.replace(/\\n/g,'\n')};
 }
 const clientEmail=process.env.FIREBASE_CLIENT_EMAIL,privateKey=process.env.FIREBASE_PRIVATE_KEY;
 if(clientEmail&&privateKey)return {projectId:process.env.FIREBASE_PROJECT_ID||firebaseWebConfig.projectId,clientEmail,privateKey:privateKey.replace(/\\n/g,'\n')};
 return null;
}

export function firebaseConfigured(){return serviceAccount()!==null;}

function document(){
 const account=serviceAccount();
 if(!account)throw new Error('Credencial de servidor do Firebase não configurada.');
 const existing=getApps().find(app=>app.name===appName);
 const app=existing||initializeApp({credential:cert(account),projectId:account.projectId},appName);
 return getFirestore(app).collection('workspaces').doc('fiscaliza');
}

export async function readFirebaseWorkspace():Promise<WorkspaceRow>{
 const reference=document(),database=reference.firestore;
 return database.runTransaction(async transaction=>{
  const snapshot=await transaction.get(reference);
  if(snapshot.exists){const value=snapshot.data() as WorkspaceRow;if(typeof value.payload!=='string'||!Number.isInteger(value.version))throw new Error('Os dados do Firestore estão em formato inválido.');return value;}
  const initial:WorkspaceRow={payload:JSON.stringify(initialData()),version:0};transaction.create(reference,initial);return initial;
 });
}

export async function updateFirebaseWorkspace(payload:string,expectedVersion:number):Promise<boolean>{
 const reference=document(),database=reference.firestore;
 return database.runTransaction(async transaction=>{
  const snapshot=await transaction.get(reference);if(!snapshot.exists)return false;
  const current=snapshot.data() as WorkspaceRow;if(current.version!==expectedVersion)return false;
  transaction.update(reference,{payload,version:expectedVersion+1});return true;
 });
}

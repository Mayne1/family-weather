'use client';
import {useEffect,useState} from 'react';
import {getValidSession} from '../lib/firebaseAuth';

async function api(action:string, body?:unknown) {
 const session=await getValidSession();if(!session)throw Error('Sign in to turn on reply notifications.');
 const response=await fetch(`/api/notifications/${action}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.idToken}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Could not update notifications.');return data;
}
function applicationKey(value:string) {
 const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export default function ReplyNotifications() {
 const [registration,setRegistration]=useState<ServiceWorkerRegistration|null>(null);
 const [key,setKey]=useState(''),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('Checking notification support…');
 useEffect(()=>{let active=true;
  async function init(){
   const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
   const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator & {standalone?:boolean}).standalone;
   if(ios&&!standalone){setMessage('On iPhone or iPad: tap Share → Add to Home Screen. Open Family Weather from that icon, sign in, then turn on notifications here.');return;}
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setMessage('This browser does not support reply notifications. Try a current Safari, Chrome, Edge or Firefox browser.');return;}
   try{
    const config=await api('config');if(!config.enabled){setMessage('Reply notifications will be available after the server update.');return;}
    await navigator.serviceWorker.register('/reply-notifications-sw.js',{scope:'/',updateViaCache:'none'});
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();const status=sub?await api('status',{endpoint:sub.endpoint}):{subscribed:false};
    if(!active)return;
    setRegistration(reg);setKey(config.publicKey);setEnabled(status.subscribed);
    setMessage(status.subscribed?'Reply notifications are on for this device.':'Get notified about replies to all your invitations and announcements—even when this page is closed.');
    const badges=navigator as Navigator & {clearAppBadge?:()=>Promise<void>};void badges.clearAppBadge?.().catch(()=>{});
   }catch(e){if(active)setMessage(e instanceof Error?e.message:'Could not prepare notifications.');}
  }
  void init();return()=>{active=false;};
 },[]);
 async function toggle(){
  if(!registration)return;
  setBusy(true);
  try{
   if(enabled){const sub=await registration.pushManager.getSubscription();if(sub){await api('unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}setEnabled(false);setMessage('Reply notifications are off for this device.');}
   else {
    // Permission is requested directly from the tap, before any network await.
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){setMessage('Notifications are blocked or were not allowed. You can enable them in your browser or phone notification settings.');return;}
    const sub=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(key)});
    await api('subscribe',sub.toJSON());setEnabled(true);setMessage('You’re set. New invitation responses and announcement replies will notify this device.');
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Could not update notifications.');}finally{setBusy(false);}
 }
 return <section className="replyNotifications" aria-label="Reply notifications"><div><strong>Know when someone responds</strong><p role="status">{message}</p></div>{registration&&key?<button type="button" onClick={()=>void toggle()} disabled={busy}>{busy?'Saving…':enabled?'Turn off notifications':'Notify me when someone responds'}</button>:null}</section>;
}

import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { apiRequest, authHeaders, getValidSession, type AuthSession } from './api';
import { collectResponseWidgetSummary, type ResponseWidgetSummary } from './responseWidgetSummary';
const WidgetBridge=registerPlugin<{save(options: {signedIn:boolean; summary?:ResponseWidgetSummary}):Promise<void>}>('ResponseWidgets');
export function startResponseWidgetSync(session: AuthSession|null) {
  if(!Capacitor.isNativePlatform())return;
  let disposed=false,busy=false;
  const save=(options:{signedIn:boolean;summary?:ResponseWidgetSummary})=>disposed?Promise.resolve():WidgetBridge.save(options).catch(()=>undefined);
  const initialize=save({signedIn:Boolean(session)});
  async function refresh(){
    await initialize;
    if(disposed||busy||!session||document.visibilityState==='hidden')return;
    busy=true;
    try{
      const fresh=await getValidSession();
      if(!fresh||fresh.localId!==session.localId){await save({signedIn:false});return;}
      const summary=await collectResponseWidgetSummary(path=>apiRequest(path,{headers:authHeaders(fresh)}));
      await save({signedIn:true,summary});
    }catch{/* Keep the last successful snapshot and its timestamp on transient failures. */}
    finally{busy=false;}
  }
  void refresh();
  const timer=setInterval(()=>void refresh(),300000);
  const listener=App.addListener('appStateChange',({isActive})=>{if(isActive)void refresh();});
  return()=>{disposed=true;clearInterval(timer);void listener.then(h=>h.remove());};
}

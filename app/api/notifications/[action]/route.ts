import { NextRequest, NextResponse } from 'next/server';
import { backendUrl } from '../../../lib/serverConfig';
import { enforceRateLimit } from '../../../lib/requestSecurity';
async function proxy(req: NextRequest, context: {params: Promise<{action:string}>}) {
 const {action}=await context.params;
 if(!(req.method==='GET'?action==='config':['status','subscribe','unsubscribe'].includes(action)))return NextResponse.json({ok:false},{status:404});
 const limited=enforceRateLimit(req,'push-subscriptions',30,60000);if(limited)return limited;
 const authorization=req.headers.get('authorization');
 if(!authorization?.startsWith('Bearer '))return NextResponse.json({ok:false,error:'Sign in first.'},{status:401});
 try{
  const body=req.method==='POST'?await req.text():undefined;
  if(body&&body.length>4096)return NextResponse.json({ok:false},{status:413});
  const response=await fetch(backendUrl(`/notifications/${action}`),{method:req.method,headers:{Authorization:authorization,'Content-Type':'application/json'},body,cache:'no-store',signal:AbortSignal.timeout(15000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({ok:false,error:'Notifications are temporarily unavailable.'},{status:503});}
}
export const GET=proxy;export const POST=proxy;

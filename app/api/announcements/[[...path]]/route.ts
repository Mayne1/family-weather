import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../lib/serverConfig";
import { enforceRateLimit } from "../../../lib/requestSecurity";
async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
 const limited=enforceRateLimit(request,"announcements",60,60000);if(limited)return limited;
 const path=(await context.params).path||[];
 if(path.length>2||path.some(p=>!/^[-a-zA-Z0-9]+$/.test(p)))return NextResponse.json({ok:false},{status:404});
 try {
  const body=request.method==='POST'?await request.text():undefined;
  if(body&&body.length>10000)return NextResponse.json({ok:false,error:"Message too long."},{status:413});
  const response=await fetch(backendUrl(`/announcements${path.length?'/'+path.join('/'):''}`),{method:request.method,headers:{'Content-Type':'application/json','User-Agent':request.headers.get('user-agent')||'',Authorization:request.headers.get('authorization')||'',...(path.length===1&&path[0]==='sms-webhook'?{'x-fw-sms-secret':request.headers.get('x-fw-sms-secret')||''}:{})},body,cache:'no-store',signal:AbortSignal.timeout(60000)});
  const data=await response.json();return NextResponse.json(data,{status:response.status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 }catch{return NextResponse.json({ok:false,error:"The announcement service is temporarily unavailable. Your message has not been cleared; please try again."},{status:503});}
}
export const GET=proxy;export const POST=proxy;

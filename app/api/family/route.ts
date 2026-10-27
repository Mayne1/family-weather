import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../lib/serverConfig";
import { enforceRateLimit } from "../../lib/requestSecurity";
async function proxy(request: NextRequest, post: boolean) {
 const authorization=request.headers.get('authorization') || '';
 if(!authorization.startsWith('Bearer ')) return NextResponse.json({ok:false,error:'Sign in to open Family Access.'},{status:401});
 if(post){const limited=enforceRateLimit(request,'family-access',10,30*60_000);if(limited)return limited;}
 try {
  const body=post?await request.json():null;
  if(post && !['family_redeem','family_create','family_close'].includes(body?.action)) return NextResponse.json({ok:false,error:'Invalid request.'},{status:400});
  const response=await fetch(backendUrl('/billing/promo-codes'+(post?'':'?family=1')),{method:post?'POST':'GET',headers:{Authorization:authorization,'Content-Type':'application/json'},body:post?JSON.stringify({action:body.action,code:String(body.code || '').slice(0,34)}):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({ok:false,error:'Family Access is temporarily unavailable. Please try again.'},{status:503});}
}
export function GET(request:NextRequest){return proxy(request,false);}
export function POST(request:NextRequest){return proxy(request,true);}

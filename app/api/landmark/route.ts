import { NextRequest, NextResponse } from "next/server";
import { findLandmark } from "../../lib/landmark";
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 const lat=Number(q.get("lat")),lon=Number(q.get("lon"));
 if(!q.has("lat")||!q.has("lon")||!q.get("lat")?.trim()||!q.get("lon")?.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return NextResponse.json({landmark:null},{status:400});
 try{return NextResponse.json({landmark:await findLandmark(Math.round(lat*100)/100,Math.round(lon*100)/100)},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});}
 catch{return NextResponse.json({landmark:null},{headers:{"Cache-Control":"no-store"}});}
}

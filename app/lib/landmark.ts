export type Landmark = { title:string; description:string; image:string; article:string; credit:string; license:string; licenseUrl:string; fileUrl:string };
type Page = { title:string; extract?:string; thumbnail?:{source:string;width:number;height:number}; pageimage?:string; coordinates?:{lat:number;lon:number}[] };
const preferred: [number,number,string][] = [
 [37.9577,-121.2908,"Stockton Channel"], [38.5816,-121.4944,"Tower Bridge (Sacramento, California)"],
 [38.627,-90.1994,"Gateway Arch"], [40.7128,-74.006,"Statue of Liberty"],
 [38.9072,-77.0369,"Washington Monument"], [29.4241,-98.4936,"Alamo Mission"],
 [36.1627,-86.7816,"Grand Ole Opry"], [37.7749,-122.4194,"Lombard Street (San Francisco)"],
 [34.0736,-118.4004,"Rodeo Drive"], [42.3314,-83.0458,"The Spirit of Detroit"],
];
export function preferredLandmark(lat:number,lon:number){
 return preferred.find(([a,b])=>Math.hypot((lat-a)*111,(lon-b)*111*Math.cos(lat*Math.PI/180))<18)?.[2];
}
const plain=(s:string)=>s.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const safe=(s:string,host:string)=>{try{const u=new URL(s);return u.protocol==="https:"&&(u.hostname===host||u.hostname.endsWith("."+host));}catch{return false;}};
async function query(host:string,params:Record<string,string>,signal:AbortSignal){
 const r=await fetch(`https://${host}/w/api.php?${new URLSearchParams({action:"query",format:"json",formatversion:"2",...params})}`,{signal,headers:{"User-Agent":"FamilyWeather/1.0 (https://thefamilyweather.com; contact@thefamilyweather.com)"},next:{revalidate:86400}});
 if(!r.ok)throw new Error("Landmark source unavailable");
 return r.json();
}
export async function findLandmark(lat:number,lon:number):Promise<Landmark|null>{
 const signal=AbortSignal.timeout(12000);
 const props={prop:"pageimages|extracts|coordinates",piprop:"thumbnail|name",pithumbsize:"1600",pilicense:"free",pilimit:"20",exintro:"1",explaintext:"1",exsentences:"2",exlimit:"20",colimit:"max"};
 const title=preferredLandmark(lat,lon);
 let pages:Page[]=[];
 if(title){const d=await query("en.wikipedia.org",{...props,titles:title,redirects:"1"},signal);pages=d.query?.pages||[];}
 if(!pages.some(p=>p.thumbnail&&p.pageimage)){
 const d=await query("en.wikipedia.org",{...props,generator:"geosearch",ggscoord:`${lat}|${lon}`,ggsradius:"10000",ggslimit:"20",ggsnamespace:"0"},signal);
 pages=(d.query?.pages||[]).sort((a:Page,b:Page)=>score(b)-score(a));
 }
 for(const p of pages.filter(p=>p.thumbnail&&p.pageimage&&p.extract).slice(0,4)){
  if(!safe(p.thumbnail!.source,"upload.wikimedia.org")&&!safe(p.thumbnail!.source,"thumb.wikimedia.org"))continue;
  const d=await query("commons.wikimedia.org",{titles:`File:${p.pageimage}`,prop:"imageinfo",iiprop:"url|extmetadata"},signal);
  const info=d.query?.pages?.[0]?.imageinfo?.[0];const m=info?.extmetadata;
  if(!m||m.Restrictions?.value||!m.LicenseShortName?.value||!m.Artist?.value)continue;
  const license=plain(m.LicenseShortName.value);
  if(!/^(CC BY|CC0|Public domain)/i.test(license))continue;
  const fileUrl=info.descriptionurl;
  if(!safe(fileUrl,"commons.wikimedia.org"))continue;
  const licenseUrl=(m.LicenseUrl?.value||fileUrl).replace(/^http:\/\//,"https://");
  if(!safe(licenseUrl,"creativecommons.org")&&!safe(licenseUrl,"commons.wikimedia.org"))continue;
  return {title:p.title,description:p.extract!.slice(0,900),image:p.thumbnail!.source,article:`https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replaceAll(" ","_"))}`,credit:plain(m.Attribution?.value||m.Artist.value),license,licenseUrl,fileUrl};
 }
 return null;
}
function score(p:Page){return (/waterfront|landmark|monument|memorial|bridge|museum|palace|cathedral|castle|park|historic|tower|arch/i.test(p.title)?10:0)+(/railway|station|school|highway|district|county|election/i.test(p.title)?-15:0)+(p.thumbnail?5:0);}

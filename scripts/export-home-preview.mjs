import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
let html=await fs.readFile(path.join(root,'.next/server/app/design-preview.html'),'utf8');
for(const match of [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]){
 const css=await fs.readFile(path.join(root,'.next',match[1].replace('/_next/','')),'utf8');
 html=html.replace(match[0],`<style>${css}</style>`);
}
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
const photo=(await fs.readFile(path.join(root,'public/weather-terrace-preview.png'))).toString('base64');
html=html.replaceAll('/weather-terrace-preview.png',`data:image/png;base64,${photo}`);
html=html.replaceAll('Your local weather','Stockton · example weather').replaceAll('Waiting for weather','Partly cloudy').replaceAll('Checking the latest observation…','Example readings · design preview');
html=html.replace(/data-preview-weather="temp">—(?:<!-- -->)?°/g,'data-preview-weather="temp">76°').replace(/data-preview-weather="wind">—(?:<!-- -->)? mph/g,'data-preview-weather="wind">8 mph').replace(/data-preview-weather="rain">—(?:<!-- -->)?%/g,'data-preview-weather="rain">10%');
html=html.replace(/<strong>—<!-- -->°<\/strong>/g,'<strong>76°</strong>').replace(/Feels like <!-- -->—<!-- -->°/g,'Feels like 75°').replace(/—<!-- -->° \/ <!-- -->—<!-- -->°/g,'81° / 58°').replace(/—<!-- --> mph/g,'8 mph').replace(/—<!-- -->%/g,'10%');
html=html.replace(/href="\/(?!design-preview)([^"]*)"/g,'href="https://thefamilyweather.com/$1"').replaceAll('href="/design-preview"','href="#"');
const script=`
const form=document.querySelector('form');
form.addEventListener('submit',event=>{event.preventDefault();const q=id=>document.getElementById(id)?.value||'';location.href='https://thefamilyweather.com/plan?'+new URLSearchParams({activity:q('mag-activity'),location:q('mag-location'),date:q('mag-date')});});
document.querySelectorAll('form button[type="button"]').forEach(button=>button.onclick=()=>{document.getElementById('mag-activity').value=button.textContent;});
const now=new Date();document.getElementById('mag-date').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
`;
html=html.replace('</body>',`<script>${script}</script></body>`);
const destination=path.resolve(process.argv[2]||'../family-weather-magazine-preview.html');
await fs.writeFile(destination,html);
console.log(destination);

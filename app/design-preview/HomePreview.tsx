"use client";

import { fetchHomeWeather } from "../lib/homeWeatherClient";
import { localWeatherDate } from "../lib/forecastDates";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import RightNowStrip from "../components/RightNowStrip";
import LocationSearchInput from "../components/LocationSearchInput";
import WeatherWatch from "../components/weather-media/WeatherWatch";
import type { Landmark } from "../lib/landmark";
import styles from "./preview.module.css";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";

type WeatherDay = { date:string; weather_code:number; temp_max_f:number|null; temp_min_f:number; precip_prob_pct:number; wind_max_mph:number; shortForecast?:string };
type Snapshot = { timezone?:string;lat?:number;lon?:number;label?:string; current_source?:string;refining_current?:boolean;current?:{temp_f:number;feels_like_f?:number;wind_mph:number|null;humidity_pct?:number|null;humidity_estimated?:boolean;weather_code:number}|null; days?:WeatherDay[]; air_quality?:{us_aqi:number;category:string;updated_at:string}|null };
const HOME_LOCATION_STORAGE_KEY = "family-weather-home-location-v2";

function Icon({name}:{name:"sun"|"wind"|"rain"|"history"|"share"|"arrow"}){return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {name==="sun"&&<><circle cx="16" cy="16" r="6"/><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3"/></>}
  {name==="wind"&&<><path d="M3 10h18a4 4 0 1 0-4-4M3 16h24a4 4 0 1 1-4 4M3 22h10a3 3 0 1 1-3 3"/></>}
  {name==="rain"&&<><path d="M8 20a6 6 0 0 1 1-12 8 8 0 0 1 15 4 5 5 0 0 1 0 10H8"/><path d="m11 25-2 4m8-4-2 4m8-4-2 4"/></>}
  {name==="history"&&<><path d="M5 8h22v20H5zM10 3v9M22 3v9M5 15h22"/><path d="M10 20h4m4 0h4m-12 5h4"/></>}
  {name==="share"&&<><circle cx="7" cy="16" r="3"/><circle cx="24" cy="7" r="3"/><circle cx="24" cy="25" r="3"/><path d="m10 14 11-6m-11 10 11 6"/></>}
  {name==="arrow"&&<path d="M5 16h22m-8-8 8 8-8 8"/>}
 </svg>}

function conditionLabel(code?:number){
  if(code===undefined)return "Loading local weather";
  if(code>=200&&code<300)return "Thunderstorms";
  if(code>=300&&code<600)return "Rain nearby";
  if(code>=600&&code<700)return "Snow nearby";
  if(code>=700&&code<800)return "Hazy skies";
  if(code===800)return "Clear skies";
  if(code<=802)return "Partly cloudy";
  return "Cloudy skies";
}

function weatherMood(code?:number){
  if(code===undefined)return styles.moodClear;
  if(code>=200&&code<600)return styles.moodRain;
  if(code>=600&&code<700)return styles.moodSnow;
  if(code>=803)return styles.moodCloud;
  return styles.moodClear;
}

function weatherScene(code?:number){
  if(code===undefined)return "/mobile-weather-scenes/partly.webp";
  if(code>=200&&code<600)return "/mobile-weather-scenes/storm.webp";
  if(code>=600&&code<700)return "/mobile-weather-scenes/snow.webp";
  if(code>=803)return "/mobile-weather-scenes/cloudy.webp";
  if(code>=801)return "/mobile-weather-scenes/partly.webp";
  return "/mobile-weather-scenes/sunny-clear-v2.webp";
}

function forecastIcon(code:number){
  if(code>=200&&code<700)return "rain";
  if(code>=801)return "cloud";
  return "sun";
}

export default function HomePreview(){
 const requestVersion=useRef(0);
 const refinementTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const[activity,setActivity]=useState("");
 const[location,setLocation]=useState("");
 const[date,setDate]=useState("");
 const[weather,setWeather]=useState<Snapshot|null>(null);
 const[landmark,setLandmark]=useState<Landmark|null>(null);
 const[failedImage,setFailedImage]=useState<string|null>(null);
 const[status,setStatus]=useState("Checking the latest observation…");

 async function loadWeather(query="",force=false){
  const version=++requestVersion.current;
  let data:Snapshot;
  try{data=await fetchHomeWeather<Snapshot>(query,{force})}
  catch(error){if(version!==requestVersion.current)return;throw error}
  if(version!==requestVersion.current)return;
  setWeather(data);
  if(refinementTimer.current)clearTimeout(refinementTimer.current);
  if(data.refining_current){
   setStatus("Checking conditions closer to this location…");
   refinementTimer.current=setTimeout(()=>{void loadWeather(query,true).catch(()=>setStatus("Latest available observation"))},6000);
  }else setStatus("Latest available observation");
 }

 useEffect(()=>{
  let query="";
  try{
   const saved=JSON.parse(localStorage.getItem(HOME_LOCATION_STORAGE_KEY)||"null") as {lat?:number;lon?:number}|null;
   if(Number.isFinite(saved?.lat)&&Number.isFinite(saved?.lon))query=`?lat=${saved?.lat}&lon=${saved?.lon}`;
  }catch{/* A malformed saved preference should never block the homepage. */}
  void loadWeather(query).catch(()=>setStatus("Live reading is temporarily unavailable. Planning tools are still open."));
  return ()=>{requestVersion.current++;if(refinementTimer.current)clearTimeout(refinementTimer.current)};
  // The default is deliberate; location access remains an explicit visitor action.
 },[]);

 useEffect(()=>{
  setLandmark(null);
  setFailedImage(null);
  if(weather?.lat==null||weather?.lon==null)return;
  const controller=new AbortController();
  fetch(`/api/landmark?lat=${weather.lat.toFixed(2)}&lon=${weather.lon.toFixed(2)}`,{signal:controller.signal})
   .then(r=>r.ok?r.json():null).then(data=>{if(!controller.signal.aborted)setLandmark(data?.landmark||null);}).catch(()=>{});
  return ()=>controller.abort();
 },[weather?.lat,weather?.lon]);
 const visibleLandmark=landmark&&failedImage!==landmark.image?landmark:null;
 const useCurrentLocation=()=>{
  if(!navigator.geolocation){setStatus("This browser cannot provide a location.");return;}
  setStatus("Finding your current location…");
  navigator.geolocation.getCurrentPosition(({coords})=>{
   localStorage.setItem(HOME_LOCATION_STORAGE_KEY,JSON.stringify({lat:coords.latitude,lon:coords.longitude,confirmed:true}));
   void loadWeather(`?lat=${coords.latitude}&lon=${coords.longitude}`).catch(()=>setStatus("Your location was found, but its weather could not be loaded."));
  },()=>setStatus("Location was not changed. You can still use the default weather desk."),{enableHighAccuracy:false,timeout:10000,maximumAge:900000});
 };

 // A fresh document keeps advertising code away from visitor-entered planner details.
 // eslint-disable-next-line @next/next/no-location-assign-relative-destination
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();window.location.assign(`/plan?${new URLSearchParams({activity,location,date})}`)}
 const read=(v?:number|null)=>typeof v==="number"&&Number.isFinite(v)?Math.round(v):"—";
 const current=weather?.current;
 const day=weather?.days?.find(day=>day.date===localWeatherDate(weather?.timezone));
 const conditionCode=current?.weather_code??day?.weather_code;
 const condition=conditionLabel(conditionCode);
 const today=localWeatherDate(weather?.timezone);

 return <div className={styles.page}>
  <PublicHeader />
  <RightNowStrip snapshot={weather} onLocate={useCurrentLocation}/>
  <main>
   <section className={styles.frontPage}>
    <article className={`${styles.leadStory} ${weatherMood(conditionCode)}`}><img className={visibleLandmark?styles.landmarkPhoto:styles.conditionPhoto} src={visibleLandmark?.image||weatherScene(conditionCode)} alt={visibleLandmark?`${visibleLandmark.title} near ${weather?.label||"your area"}`:`${condition} near ${weather?.label||"your area"}`} onError={visibleLandmark?()=>setFailedImage(visibleLandmark.image):undefined}/><div className={styles.leadShade}/><div className={styles.leadCopy}><p className={styles.kicker}>GOOD PLANS BRING PEOPLE TOGETHER</p><h1>Make it a date.<br/><em>Invite your people.</em></h1><p>Create a beautiful invitation, share one link, and keep everyone’s replies together. Create a free account to make invitations and manage replies. Guests can RSVP without signing up.</p><div className={styles.heroActions}><Link href="/create-event">Create a free invitation <Icon name="arrow"/></Link><a href="#activity-checker">Check the weather first</a></div></div><div className={styles.liveBadge}><span>LIVE CONDITIONS</span><strong>{read(current?.temp_f)}°</strong><small>{condition}</small></div></article>
    <aside className={styles.frontRail}>
     <article data-tour="invitations" className={styles.invitationSpotlight}>
      <div className={styles.invitationArtwork}><img src="/invitations/signature/family-friends.webp" alt="Gold-lettered Family & Friends invitation with a warmly lit outdoor gathering" width={1024} height={1536}/><span>INVITATIONS FOR REAL LIFE</span></div>
      <div className={styles.invitationIntro}><p className={styles.kicker}>FROM FIRST IDEA TO FINAL RSVP</p><h2>A little more personal.<br/>A lot easier to share.</h2><p>Birthdays, family cookouts, weddings, and just-because get-togethers. Make the invitation yours.</p><Link href="/create-event">Start your invitation <span aria-hidden="true">→</span></Link><small>Free organizer account. Guests RSVP without signing up. Optional ad removal.</small></div>
     </article>
     <article data-tour="history" className={styles.shareCard}><Icon name="history"/><div><p className={styles.kicker}>PLANNING FURTHER AHEAD?</p><h3>Look back before you book.</h3><p>Compare your destination and date across five previous years. History is a guide, not a forecast.</p></div><Link href="/weather-history" aria-label="Research a future date">→</Link></article>
    </aside>
   </section>
   <section className={styles.invitationSteps} aria-label="How invitations work"><div><span>01</span><p><strong>Make it yours</strong>Choose your occasion and invitation design.</p></div><div><span>02</span><p><strong>Share one link</strong>Send it through your own messages or social apps.</p></div><div><span>03</span><p><strong>Keep everyone together</strong>Track RSVPs and check the weather for your plan.</p></div></section>
   <section className={styles.trending}><strong>WHAT ARE YOU PLANNING?</strong>{["A beach day","Outdoor dining","Yard work","A destination trip","A family cookout","A city event"].map(x=><a href="#activity-checker" key={x} onClick={()=>setActivity(x)}>{x}<span>↗</span></a>)}</section>
   <section className={styles.planningDesk} id="activity-checker"><div className={styles.deskHeading}><p className={styles.kicker}>THE PLANNING DESK</p><h2>What do you want<br/>the weather to help with?</h2><p>Use plain language: “cut the grass before the game,” “serve dinner outside,” or “take a client to the park.” The answer changes with the activity because temperature alone never tells the whole story.</p><div className={styles.deskProof}><span>WE CHECK</span><b>Heat</b><b>Rain</b><b>Wind</b><b>Timing</b><b>Activity fit</b></div></div>
    <form data-tour="planner" className={styles.planner} onSubmit={submit}><div className={styles.formHead}><span><Icon name="sun"/></span><div><p>YOUR DAY, BETTER PLANNED</p><h3>Let’s find your window.</h3></div><small>FREE WEATHER PLANNING<br/>NO ACCOUNT NEEDED</small></div><label htmlFor="mag-activity">1 · WHAT’S THE PLAN?</label><input id="mag-activity" required value={activity} onChange={e=>setActivity(e.target.value)} placeholder="Dinner outside, lawn work, client meeting…"/><div className={styles.suggestions}>{["Beach day","Outdoor dining","Yard work","Travel"].map(x=><button type="button" key={x} aria-pressed={activity===x} onClick={()=>setActivity(x)}>{x}</button>)}</div><div className={styles.formGrid}><div><label htmlFor="mag-location">2 · WHERE?</label><LocationSearchInput id="mag-location" value={location} onChange={setLocation} onSelect={p=>setLocation(p.label)} required placeholder="Address, venue, landmark, or city"/></div><div><label htmlFor="mag-date">3 · WHICH DAY?</label><input id="mag-date" type="date" min={today} required value={date} onChange={e=>setDate(e.target.value)}/></div></div><button className={styles.planButton} type="submit">Find my weather window <Icon name="arrow"/></button><p className={styles.formFoot}>Forecast-range dates use forecast data. Later dates use same-date history and are labeled clearly.</p></form>
   </section>
   {visibleLandmark&&<aside className={styles.localCaption} aria-label="About this local landmark"><img src={visibleLandmark.image} alt={visibleLandmark.title} onError={()=>setFailedImage(visibleLandmark.image)}/><div><p className={styles.kicker}>{weather?.label} · AROUND HERE</p><h2>{visibleLandmark.title}</h2><p>{visibleLandmark.description}</p><a href={visibleLandmark.article} target="_blank" rel="noopener noreferrer">Read more on Wikipedia ↗</a><small>Photo: {visibleLandmark.credit} · <a href={visibleLandmark.licenseUrl} target="_blank" rel="noopener noreferrer">{visibleLandmark.license}</a> · <a href={visibleLandmark.fileUrl} target="_blank" rel="noopener noreferrer">Original photo</a><br/>Text: Wikipedia contributors, CC BY-SA. Photo cropped to fit.</small></div></aside>}
   <section className={styles.forecastDesk}><div className={styles.sectionBar}><div><p className={styles.kicker}>TODAY & THE DAYS AHEAD</p><h2>The weather desk</h2></div><Link href="/today">Open today’s full report ↗</Link></div><div className={styles.forecastLayout}><article className={styles.nowPanel}><div><span>RIGHT NOW</span><small>{status}</small></div><div className={styles.bigTemp}><strong>{read(current?.temp_f)}°</strong><span><Icon name="sun"/><b>{condition}</b><small>Feels like {read(current?.feels_like_f)}°</small></span></div><div className={styles.nowStats}><span><small>HIGH / LOW</small><b>{read(day?.temp_max_f)}° / {read(day?.temp_min_f)}°</b></span><span><small>WIND</small><b>{current?.wind_mph == null ? "Unavailable" : `${read(current.wind_mph)} mph`}</b></span><span><small>RAIN</small><b>{read(day?.precip_prob_pct)}%</b></span><span><small>HUMIDITY{current?.humidity_estimated ? " (EST.)" : ""}</small><b>{current?.humidity_pct == null ? "—" : `${read(current.humidity_pct)}%`}</b></span><span><small>AQI (EST.)</small><b>{weather?.air_quality ? weather.air_quality.us_aqi : "—"}</b></span></div></article><div className={styles.fiveDay}>{(weather?.days||[]).slice(0,5).map((item,index)=><Link href={`/today?date=${encodeURIComponent(item.date)}#day-details`} key={item.date}><span>{item.date===today?"TODAY":new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US",{weekday:"short"}).toUpperCase()}</span><i className={styles[forecastIcon(item.weather_code)]}/><strong>{read(item.temp_max_f)}°</strong><small>{read(item.temp_min_f)}° low</small><em>{item.precip_prob_pct}% rain</em></Link>)}{!weather?Array.from({length:5},(_,i)=><article key={i}><span>DAY {i+1}</span><i className={styles.cloud}/><strong>—</strong><small>Loading</small></article>):null}</div><article data-tour="decision" className={styles.explainer}><p className={styles.kicker}>WHY THIS WINDOW?</p><h3>A recommendation should explain itself.</h3><p>Family Weather weighs the activity, temperature, rain, wind, daylight, and useful hours—then tells you why one window fits better than another.</p><Link href="/how-it-works">See how the score works →</Link></article></div></section>
   <section className={styles.intelligence}><div className={styles.intelTitle}><p className={styles.kicker}>FAMILY WEATHER INTELLIGENCE</p><h2>Forecast for now.<br/>History for later.<br/><em>Meaning for both.</em></h2></div>{[["01","sun","Today’s weather","Current conditions and the coming days in one useful view.","/today"],["02","history","Weather memory","Compare the same calendar date across five previous years.","/weather-history"],["03","share","Make it a plan","Build an event and invitation only when other people need to join.","/create-event"]].map((x,i)=><Link href={x[4]} className={`${styles.intelCard} ${i===2?styles.goldCard:""}`} key={x[0]}><span>{x[0]}</span><Icon name={x[1] as "sun"|"history"|"share"}/><h3>{x[2]}</h3><p>{x[3]}</p><strong>OPEN TOOL →</strong></Link>)}</section>
   <WeatherWatch/>
  </main>
  <PublicFooter firstVisitTour />
 </div>
}

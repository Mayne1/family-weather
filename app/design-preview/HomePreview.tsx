"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import HomeAccount from "../components/HomeAccount";
import LocationSearchInput from "../components/LocationSearchInput";
import { weatherStories } from "../weather-stories/stories";
import styles from "./preview.module.css";

type WeatherDay = { date:string; weather_code:number; temp_max_f:number; temp_min_f:number; precip_prob_pct:number; wind_max_mph:number; shortForecast?:string };
type Snapshot = { label?:string; current?:{temp_f:number;feels_like_f?:number;wind_mph:number|null;humidity_pct?:number|null;humidity_estimated?:boolean;weather_code:number}|null; days?:WeatherDay[]; air_quality?:{us_aqi:number;category:string;updated_at:string}|null };
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

function forecastIcon(code:number){
  if(code>=200&&code<700)return "rain";
  if(code>=801)return "cloud";
  return "sun";
}

export default function HomePreview(){
 const router=useRouter();
 const[activity,setActivity]=useState("");
 const[location,setLocation]=useState("");
 const[date,setDate]=useState("");
 const[weather,setWeather]=useState<Snapshot|null>(null);
 const[status,setStatus]=useState("Checking the latest observation…");

 async function loadWeather(query=""){
  const response=await fetch(`/api/weather/home${query}`,{cache:"no-store"});
  const data=await response.json();
  if(!response.ok||!data.ok)throw new Error("Weather is temporarily unavailable.");
  setWeather(data);
  setStatus("Latest available observation");
 }

 useEffect(()=>{
  let query="";
  try{
   const saved=JSON.parse(localStorage.getItem(HOME_LOCATION_STORAGE_KEY)||"null") as {lat?:number;lon?:number}|null;
   if(Number.isFinite(saved?.lat)&&Number.isFinite(saved?.lon))query=`?lat=${saved?.lat}&lon=${saved?.lon}`;
  }catch{/* A malformed saved preference should never block the homepage. */}
  fetch(`/api/weather/home${query}`,{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok||!data.ok)throw new Error();
   setWeather(data);
   setStatus("Latest available observation");
  }).catch(()=>setStatus("Live reading is temporarily unavailable. Planning tools are still open."));
  // The default is deliberate; location access remains an explicit visitor action.
 },[]);

 const useCurrentLocation=()=>{
  if(!navigator.geolocation){setStatus("This browser cannot provide a location.");return;}
  setStatus("Finding your current location…");
  navigator.geolocation.getCurrentPosition(({coords})=>{
   localStorage.setItem(HOME_LOCATION_STORAGE_KEY,JSON.stringify({lat:coords.latitude,lon:coords.longitude,confirmed:true}));
   void loadWeather(`?lat=${coords.latitude}&lon=${coords.longitude}`).catch(()=>setStatus("Your location was found, but its weather could not be loaded."));
  },()=>setStatus("Location was not changed. You can still use the default weather desk."),{enableHighAccuracy:false,timeout:10000,maximumAge:900000});
 };

 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();router.push(`/plan?${new URLSearchParams({activity,location,date})}`)}
 const read=(v?:number|null)=>typeof v==="number"&&Number.isFinite(v)?Math.round(v):"—";
 const current=weather?.current;
 const day=weather?.days?.[0];
 const condition=conditionLabel(current?.weather_code??day?.weather_code);
 const stories=useMemo(()=>weatherStories.slice(0,3),[]);
 const today=new Date().toISOString().slice(0,10);

 return <div className={styles.page}>
  <header className={styles.header}><Link className={styles.brand} href="/"><span className={styles.brandOrb}><Icon name="sun"/></span><span><strong>Family</strong> Weather<small>PLAN THE DAY. SHARE THE OUTLOOK.</small></span></Link><nav><Link href="/today">Today</Link><Link href="/plan">Plan an activity</Link><Link href="/weather-history">Weather history</Link><Link href="/live">Live desk</Link><Link href="/weather-stories">Stories</Link><Link href="/events">My events</Link></nav><HomeAccount/></header>
  <div className={styles.weatherTicker}><strong>RIGHT NOW</strong><span className={styles.tickerLocation}>{weather?.label||"Local weather"}</span><span><Icon name="sun"/><b>{read(current?.temp_f)}°</b> <i>{condition}</i></span><span>Feels like <b>{read(current?.feels_like_f)}°</b></span><span><Icon name="wind"/><b>{current?.wind_mph == null ? "Unavailable" : `${read(current.wind_mph)} mph`}</b> wind</span><span><Icon name="rain"/><b>{read(day?.precip_prob_pct)}%</b> rain today</span><span>Humidity{current?.humidity_estimated ? " (est.)" : ""} <b>{current?.humidity_pct == null ? "Unavailable" : `${read(current.humidity_pct)}%`}</b></span><span className={styles.airQuality} title={weather?.air_quality ? `Modeled US AQI · ${new Date(weather.air_quality.updated_at).toLocaleString()} · Open-Meteo / CAMS` : "Air quality estimate temporarily unavailable"}>Air quality <b>{weather?.air_quality ? `${weather.air_quality.us_aqi} · ${weather.air_quality.category}` : "Unavailable"}</b>{weather?.air_quality && <i>estimated AQI</i>}</span><button type="button" onClick={useCurrentLocation}>Use my location</button><Link href="/today">Full forecast →</Link></div>
  <main>
   <section className={styles.frontPage}>
    <article className={`${styles.leadStory} ${weatherMood(current?.weather_code??day?.weather_code)}`}><div className={styles.leadPhoto}/><div className={styles.leadShade}/><div className={styles.leadCopy}><p className={styles.kicker}>WEATHER THAT ANSWERS A REAL QUESTION</p><h1>Don’t just check the weather.<br/><em>Check your plan.</em></h1><p>Tell Family Weather what you want to do, where, and when. Get a weather-fit score, a useful time window, and a plain-language explanation of what could help or interfere.</p><a href="#activity-checker">Check an activity <Icon name="arrow"/></a></div><div className={styles.liveBadge}><span>LIVE CONDITIONS</span><strong>{read(current?.temp_f)}°</strong><small>{condition}</small></div></article>
    <aside className={styles.frontRail}><article className={styles.tripCard}><div><p className={styles.kicker}>PLANNING BEYOND THE FORECAST</p><span>01</span></div><h2>Going somewhere<br/>weeks from now?</h2><p>Look up the real destination and calendar date. Family Weather compares that date across five previous years so you can see the pattern without pretending history is a promise.</p><div className={styles.rainYears}><span><b>5</b><small>YEARS COMPARED</small></span><i/><span><b>1</b><small>CLEARER DECISION</small></span></div><Link href="/weather-history">Research a future date ↗</Link></article><article className={styles.shareCard}><Icon name="share"/><div><p className={styles.kicker}>WHEN THE DAY LOOKS RIGHT</p><h3>Turn the plan into an invitation.</h3><p>Create the event, choose the design, share one link, and manage replies.</p></div><Link href="/create-event" aria-label="Create an event">→</Link></article></aside>
   </section>
   <section className={styles.trending}><strong>WHAT ARE YOU PLANNING?</strong>{["A beach day","Outdoor dining","Yard work","A destination trip","A family cookout","A city event"].map(x=><a href="#activity-checker" key={x} onClick={()=>setActivity(x)}>{x}<span>↗</span></a>)}</section>
   <section className={styles.planningDesk} id="activity-checker"><div className={styles.deskHeading}><p className={styles.kicker}>THE PLANNING DESK</p><h2>What do you want<br/>the weather to help with?</h2><p>Use plain language: “cut the grass before the game,” “serve dinner outside,” or “take a client to the park.” The answer changes with the activity because temperature alone never tells the whole story.</p><div className={styles.deskProof}><span>WE CHECK</span><b>Heat</b><b>Rain</b><b>Wind</b><b>Timing</b><b>Activity fit</b></div></div>
    <form className={styles.planner} onSubmit={submit}><div className={styles.formHead}><span><Icon name="sun"/></span><div><p>YOUR DAY, BETTER PLANNED</p><h3>Let’s find your window.</h3></div><small>FREE<br/>NO ACCOUNT NEEDED</small></div><label htmlFor="mag-activity">1 · WHAT’S THE PLAN?</label><input id="mag-activity" required value={activity} onChange={e=>setActivity(e.target.value)} placeholder="Dinner outside, lawn work, client meeting…"/><div className={styles.suggestions}>{["Beach day","Outdoor dining","Yard work","Travel"].map(x=><button type="button" key={x} aria-pressed={activity===x} onClick={()=>setActivity(x)}>{x}</button>)}</div><div className={styles.formGrid}><div><label htmlFor="mag-location">2 · WHERE?</label><LocationSearchInput id="mag-location" value={location} onChange={setLocation} onSelect={p=>setLocation(p.label)} required placeholder="Address, venue, landmark, or city"/></div><div><label htmlFor="mag-date">3 · WHICH DAY?</label><input id="mag-date" type="date" min={today} required value={date} onChange={e=>setDate(e.target.value)}/></div></div><button className={styles.planButton} type="submit">Find my weather window <Icon name="arrow"/></button><p className={styles.formFoot}>Forecast-range dates use forecast data. Later dates use same-date history and are labeled clearly.</p></form>
   </section>
   <section className={styles.forecastDesk}><div className={styles.sectionBar}><div><p className={styles.kicker}>TODAY & THE DAYS AHEAD</p><h2>The weather desk</h2></div><Link href="/today">Open today’s full report ↗</Link></div><div className={styles.forecastLayout}><article className={styles.nowPanel}><div><span>RIGHT NOW</span><small>{status}</small></div><div className={styles.bigTemp}><strong>{read(current?.temp_f)}°</strong><span><Icon name="sun"/><b>{condition}</b><small>Feels like {read(current?.feels_like_f)}°</small></span></div><div className={styles.nowStats}><span><small>HIGH / LOW</small><b>{read(day?.temp_max_f)}° / {read(day?.temp_min_f)}°</b></span><span><small>WIND</small><b>{current?.wind_mph == null ? "Unavailable" : `${read(current.wind_mph)} mph`}</b></span><span><small>RAIN</small><b>{read(day?.precip_prob_pct)}%</b></span><span><small>HUMIDITY{current?.humidity_estimated ? " (EST.)" : ""}</small><b>{current?.humidity_pct == null ? "—" : `${read(current.humidity_pct)}%`}</b></span><span><small>AQI (EST.)</small><b>{weather?.air_quality ? weather.air_quality.us_aqi : "—"}</b></span></div></article><div className={styles.fiveDay}>{(weather?.days||[]).slice(0,5).map((item,index)=><Link href={`/today?date=${encodeURIComponent(item.date)}#day-details`} key={item.date}><span>{index===0?"TODAY":new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US",{weekday:"short"}).toUpperCase()}</span><i className={styles[forecastIcon(item.weather_code)]}/><strong>{read(item.temp_max_f)}°</strong><small>{read(item.temp_min_f)}° low</small><em>{item.precip_prob_pct}% rain</em></Link>)}{!weather?Array.from({length:5},(_,i)=><article key={i}><span>DAY {i+1}</span><i className={styles.cloud}/><strong>—</strong><small>Loading</small></article>):null}</div><article className={styles.explainer}><p className={styles.kicker}>WHY THIS WINDOW?</p><h3>A recommendation should explain itself.</h3><p>Family Weather weighs the activity, temperature, rain, wind, daylight, and useful hours—then tells you why one window fits better than another.</p><Link href="/how-it-works">See how the score works →</Link></article></div></section>
   <section className={styles.intelligence}><div className={styles.intelTitle}><p className={styles.kicker}>FAMILY WEATHER INTELLIGENCE</p><h2>Forecast for now.<br/>History for later.<br/><em>Meaning for both.</em></h2></div>{[["01","sun","Today’s weather","Current conditions and the coming days in one useful view.","/today"],["02","history","Weather memory","Compare the same calendar date across five previous years.","/weather-history"],["03","share","Make it a plan","Build an event and invitation only when other people need to join.","/create-event"]].map((x,i)=><Link href={x[4]} className={`${styles.intelCard} ${i===2?styles.goldCard:""}`} key={x[0]}><span>{x[0]}</span><Icon name={x[1] as "sun"|"history"|"share"}/><h3>{x[2]}</h3><p>{x[3]}</p><strong>OPEN TOOL →</strong></Link>)}</section>
   <section className={styles.storySection}><div className={styles.sectionBar}><div><p className={styles.kicker}>FROM THE WEATHER ROOM</p><h2>Plans, places & what really happened</h2></div><Link href="/weather-stories">All weather stories ↗</Link></div><div className={styles.storyGrid}>{stories.map((story,i)=><article key={story.slug}><div className={`${styles.storyImage} ${i===1?styles.pool:i===2?styles.rain:styles.jamaica}`}><span>{String(i+1).padStart(2,"0")}</span></div><p className={styles.kicker}>{story.kicker}</p><h3>{story.shortTitle}</h3><p>{story.description}</p><Link href={`/weather-stories/${story.slug}`}>Read the full story →</Link></article>)}</div></section>
   <section className={styles.invitationFeature}><div className={styles.invitationImage}><span>FAMILY WEATHER</span><strong>You’re invited</strong><small>Saturday · 6:30 PM · Dinner under the lights</small></div><div><p className={styles.kicker}>WHEN INFORMATION BECOMES A PLAN</p><h2>Ready to bring<br/>people together?</h2><p>After you check the day, turn the plan into a polished invitation. Choose a Family Weather design or bring your own artwork, share the event link, and keep replies together.</p><Link href="/create-event">Create an invitation <Icon name="arrow"/></Link></div></section>
  </main>
  <footer className={styles.footer}><div className={styles.footerBrand}><strong>Family Weather</strong><span>Weather for what you’re actually doing.</span><span>Air quality estimates: <a href="https://open-meteo.com/">Open-Meteo</a> / <a href="https://atmosphere.copernicus.eu/">CAMS ENSEMBLE and global forecasts</a>.</span></div><div><strong>PLAN</strong><Link href="/today">Today</Link><Link href="/plan">Activity planner</Link><Link href="/weather-history">Weather history</Link></div><div><strong>USE</strong><Link href="/live">Live weather desk</Link><a href="/create-event">Invitations</a><Link href="/events">My events</Link><Link href="/pricing">Pricing</Link></div><div><strong>COMPANY</strong><Link href="/about">About</Link><Link href="/faq">FAQ</Link><a href="/contact">Contact</a><a href="/privacy">Privacy</a></div></footer>
 </div>
}

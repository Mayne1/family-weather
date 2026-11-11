"use client";
import {useEffect,useState,useRef} from 'react';
import { fetchHomeWeather } from "../lib/homeWeatherClient";
import { localWeatherDate } from "../lib/forecastDates";
import styles from './right-now.module.css';
export type WeatherSnapshot={label?:string;timezone?:string;location_mode?:string;current_source?:string;refining_current?:boolean;current?:{observed_at?:string;source?:string;station?:{id:string;name?:string};temp_f:number;feels_like_f?:number;wind_mph:number|null;humidity_pct?:number|null;humidity_estimated?:boolean}|null;days?:{date:string;precip_prob_pct:number|null}[];air_quality?:{us_aqi:number;category:string}|null};
const storageKey='family-weather-home-location-v2';
export default function RightNowStrip({snapshot,onLocate}:{snapshot?:WeatherSnapshot|null;onLocate?:()=>void}){
 const[local,setLocal]=useState<WeatherSnapshot|null>(null),[now,setNow]=useState<Date|null>(null),[error,setError]=useState('');
 const requestVersion=useRef(0);
 const refinementTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const data=snapshot===undefined?local:snapshot;
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(snapshot!==undefined)return;const controller=new AbortController();
 const refresh=(force=false)=>{const version=++requestVersion.current;let query='';try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(Number.isFinite(saved?.lat)&&Number.isFinite(saved?.lon))query=`?lat=${saved.lat}&lon=${saved.lon}`}catch{}
 return fetchHomeWeather<WeatherSnapshot>(query,{force}).then(d=>{if(!controller.signal.aborted&&version===requestVersion.current){setLocal(d);setError('');if(refinementTimer.current)clearTimeout(refinementTimer.current);if(d.refining_current)refinementTimer.current=setTimeout(()=>void refresh(true),6000)}}).catch(()=>{if(!controller.signal.aborted&&version===requestVersion.current){setLocal(null);setError('Weather temporarily unavailable')}});};
 void refresh();const timer=setInterval(()=>void refresh(true),600000);return()=>{requestVersion.current++;controller.abort();clearInterval(timer);if(refinementTimer.current)clearTimeout(refinementTimer.current)};
 },[snapshot]);
 function locate(){if(onLocate){onLocate();return}if(!navigator.geolocation){setError('Location is unavailable in this browser');return}navigator.geolocation.getCurrentPosition(({coords})=>{const version=++requestVersion.current;const query=`?lat=${coords.latitude}&lon=${coords.longitude}`;try{localStorage.setItem(storageKey,JSON.stringify({lat:coords.latitude,lon:coords.longitude,confirmed:true}))}catch{}fetchHomeWeather<WeatherSnapshot>(query).then(d=>{if(version===requestVersion.current){setLocal(d);setError('');if(d.refining_current){if(refinementTimer.current)clearTimeout(refinementTimer.current);refinementTimer.current=setTimeout(()=>void fetchHomeWeather<WeatherSnapshot>(query,{force:true}).then(refined=>{if(version===requestVersion.current)setLocal(refined)}),6000)}}}).catch(()=>{if(version===requestVersion.current)setError('Could not refresh weather')})},()=>setError('Location was not changed'),{timeout:10000,maximumAge:900000})}
 const value=(n?:number|null)=>typeof n==='number'&&Number.isFinite(n)?Math.round(n):'—';
 let clock='—';if(now&&data?.timezone){try{clock=new Intl.DateTimeFormat('en-US',{timeZone:data.timezone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(now)}catch{}}
 let observation='Observation time unavailable';
 const stamp=Date.parse(data?.current?.observed_at||'');
 if(now&&Number.isFinite(stamp)){try{const age=Math.max(0,Math.floor((now.getTime()-stamp)/60000));observation='Observed '+new Intl.DateTimeFormat('en-US',{timeZone:data?.timezone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(stamp))+' ('+age+' min ago)'+(age>=120?' · Outdated':'')}catch{}}
 const provider=data?.current?.source==='open-meteo-current'?'Local conditions near this location':data?.current?.source==='nws-observation'?'National Weather Service':data?.current?.source==='aviationweather-metar'?'NOAA Aviation Weather':'Weather provider';
 const station=data?.current?.station;
 return <section className={styles.strip} aria-label="Current weather and local time" data-tour="current"><strong className={styles.heading}>RIGHT NOW</strong><span className={styles.place}>{data?.label||'Local weather'}</span><span>Local time <b>{clock}</b></span><span>Temperature <b>{value(data?.current?.temp_f)}°F</b></span><span>Feels like <b>{value(data?.current?.feels_like_f)}°F</b></span><span>Wind <b>{value(data?.current?.wind_mph)} mph</b></span><span>Rain today <b>{value(data?.days?.find(day=>day.date===localWeatherDate(data?.timezone,now||new Date()))?.precip_prob_pct)}%</b></span><span>Humidity{data?.current?.humidity_estimated?' (est.)':''} <b>{value(data?.current?.humidity_pct)}%</b></span><span title="Modeled air quality estimate">AQI (est.) <b>{value(data?.air_quality?.us_aqi)}</b>{data?.air_quality?.category?' · '+data.air_quality.category:''}</span><span>{station?.name || station?.id || provider}{station?.name && station?.id ? ` (${station.id})` : ""} · {observation}</span>{data?.location_mode === "default" ? <span>Default location, not device GPS</span> : null}<button type="button" onClick={locate}>Use my location</button>{error&&<span role="status">{error}</span>}</section>;
}

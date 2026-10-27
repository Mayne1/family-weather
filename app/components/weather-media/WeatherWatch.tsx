"use client";

import { useState } from "react";
import Link from "next/link";
import { weatherVideos } from "../../weather-stories/media";
import DemoPlaylist from "./DemoPlaylist";
import WeatherVideo from "./WeatherVideo";
import styles from "./media.module.css";

export default function WeatherWatch() {
  const [selectedId, setSelectedId] = useState(weatherVideos[0].id);
  const selected = weatherVideos.find(video => video.id === selectedId) || weatherVideos[0];
  const playlistId = (process.env.NEXT_PUBLIC_DEMO_PLAYLIST_ID ?? "PLFhecwVBN5yk").trim();
  if (playlistId && /^[A-Za-z0-9_-]+$/.test(playlistId)) return <DemoPlaylist playlistId={playlistId}/>;
  return <section className={styles.watch} aria-labelledby="weather-watch-title">
    <div className={styles.watchHeading}><p>CAUGHT ON CAMERA</p><h2 id="weather-watch-title">The forecast became<br />the story.</h2><p>Real footage. Real changes of plan. Watch how weather reshaped a festival and a city weekend.</p><Link href="/plan">Check the weather for your own plan →</Link></div>
    <div className={styles.watchPlayer}><WeatherVideo key={selected.id} video={selected} /><p className={styles.description}>{selected.description}</p><div className={styles.queue} aria-label="Choose a weather report">{weatherVideos.map(video => <button type="button" key={video.id} aria-pressed={selectedId === video.id} onClick={() => setSelectedId(video.id)}><small>{video.publisher}</small><strong>{video.title}</strong><span>{selectedId === video.id ? "Selected" : "Choose video →"}</span></button>)}</div></div>
  </section>;
}

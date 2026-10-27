"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./media.module.css";

export default function DemoPlaylist({ playlistId }: { playlistId: string }) {
 const [playing, setPlaying] = useState(false);
 return <section className={styles.watch} aria-labelledby="weather-watch-title">
  <div className={styles.watchHeading}><p>SEE FAMILY WEATHER IN ACTION</p><h2 id="weather-watch-title">A better plan.<br/>A few simple steps.</h2><p>Watch how to find your weather window, plan ahead, share an invitation, and keep up with replies.</p><Link href="/plan">Try your own plan →</Link></div>
  <div className={styles.watchPlayer}><figure className={styles.video}>
   <div className={styles.frame}>{playing ? <iframe title="Family Weather video demonstrations" src={`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&autoplay=1&playsinline=1&loop=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <button type="button" className={styles.poster} onClick={()=>setPlaying(true)} aria-label="Play Family Weather demonstration playlist"><span className={styles.play} aria-hidden="true">▶</span><span className={styles.posterTitle}>Watch Family Weather in action</span></button>}</div>
   <figcaption><span>Family Weather · Quick video guides</span><a href={`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></figcaption>
  </figure><p className={styles.description}>Press play to watch the guides in order. Use the player controls to pause or skip a video.</p></div>
 </section>;
}

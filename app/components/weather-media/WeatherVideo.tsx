"use client";

import { useState } from "react";
import Image from "next/image";
import type { WeatherVideo as Video } from "../../weather-stories/media";
import styles from "./media.module.css";

export default function WeatherVideo({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  return <figure className={styles.video}>
    <div className={styles.frame}>
      {playing ? <iframe
        title={`${video.title} — ${video.publisher}`}
        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      /> : <button type="button" className={styles.poster} onClick={() => setPlaying(true)} aria-label={`Play ${video.title} from ${video.publisher}`}>
        {!previewFailed && <Image unoptimized src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" width="480" height="360" loading="lazy" onError={() => setPreviewFailed(true)} />}
        <span className={styles.play} aria-hidden="true">▶</span>
        <span className={styles.posterTitle}>{video.title}</span>
      </button>}
    </div>
    <figcaption><span>{video.publisher} · <time dateTime={video.published}>{new Date(`${video.published}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></span><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></figcaption>
  </figure>;
}

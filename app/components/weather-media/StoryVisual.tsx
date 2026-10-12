import Image from "next/image";
import { storyMedia } from "../../weather-stories/media";
import WeatherVideo from "./WeatherVideo";
import styles from "./media.module.css";

export default function StoryVisual({ slug, detail = false }: { slug: string; detail?: boolean }) {
  const media = storyMedia[slug];
  if (!media) return null;
  return <div className={detail ? styles.detail : styles.visual}>
    {media.image ? <figure className={styles.image}>
      <Image src={media.image.src} alt={media.image.alt} width={1672} height={941} sizes={detail ? "(max-width: 800px) 90vw, 1000px" : "(max-width: 800px) 90vw, 30vw"} />
      <figcaption>{media.image.caption}</figcaption>
    </figure> : media.video ? <WeatherVideo video={media.video} /> : null}
    {detail && <><p className={styles.note}>{media.note}</p>{media.image && media.video && <WeatherVideo video={media.video} />}</>}
  </div>;
}

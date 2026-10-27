import { announcementDesigns } from './designs';
import styles from './announcements.module.css';
export default function AnnouncementCard({title,message,theme='forest'}:{title:string;message:string;theme?:string}){
 const chosen=announcementDesigns.find(design=>design.id===theme) ?? announcementDesigns[0];
 const design=chosen.id;
 return <article className={`${styles.card} ${styles[design]}`}><div className={styles.cardContent}><div className={styles.cardSeal} aria-hidden="true">{chosen.seal}</div><h2>{title}</h2><div className={styles.cardDivider} aria-hidden="true">✦</div><p>{message}</p></div></article>;
}

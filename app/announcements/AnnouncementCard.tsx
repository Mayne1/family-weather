import styles from './announcements.module.css';
export default function AnnouncementCard({title,message,theme='forest'}:{title:string;message:string;theme?:string}){
 const design=['sunrise','forest','evening'].includes(theme)?theme:'forest';
 return <article className={`${styles.card} ${styles[design]}`}><div className={styles.cardContent}><div className={styles.cardSeal} aria-hidden="true">{design==='sunrise'?'☀':design==='evening'?'✧':'♡'}</div><h2>{title}</h2><div className={styles.cardDivider} aria-hidden="true">✦</div><p>{message}</p></div></article>;
}

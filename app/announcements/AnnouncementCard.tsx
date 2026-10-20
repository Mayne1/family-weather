import styles from './announcements.module.css';

export default function AnnouncementCard({ title, message, theme = 'forest' }: { title: string; message: string; theme?: string }) {
 const design = ['sunrise', 'forest', 'evening'].includes(theme) ? theme : 'forest';
 return <article className={`${styles.card} ${styles[design]}`}>
  <div className={styles.cardArt} aria-hidden="true">
   <svg viewBox="0 0 360 130" fill="none">
    {design === 'sunrise' ? <>
     <path d="M80 82h200M95 100h170M125 116h110" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
     <circle cx="180" cy="70" r="32" fill="currentColor" opacity=".85"/>
     <path d="M180 16V5M139 29l-9-9M121 66h-13M221 29l9-9M239 66h13" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
     <path d="M49 44c10-9 17-9 27 0 10-9 17-9 27 0M266 32c7-6 12-6 19 0 7-6 12-6 19 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </> : design === 'evening' ? <>
     <path d="M202 15a42 42 0 1 0 26 67 37 37 0 0 1-26-67Z" fill="currentColor"/>
     <path d="m100 32 3 11 11 3-11 3-3 11-3-11-11-3 11-3ZM269 64l3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="currentColor"/>
     <circle cx="134" cy="99" r="2" fill="currentColor"/><circle cx="260" cy="25" r="2" fill="currentColor"/><circle cx="71" cy="84" r="2" fill="currentColor"/>
    </> : <>
     <path d="M180 99c-8-11-43-31-43-52 0-25 30-31 43-10 13-21 43-15 43 10 0 21-35 41-43 52Z" fill="currentColor"/>
     <path d="M112 102C83 80 79 50 88 27M248 102c29-22 33-52 24-75" stroke="currentColor" strokeWidth="2"/>
     <path d="M87 48C68 49 66 36 67 30c15 0 20 9 20 18ZM91 69c-19 2-26-9-26-17 16-2 25 8 26 17ZM273 48c19 1 21-12 20-18-15 0-20 9-20 18ZM269 69c19 2 26-9 26-17-16-2-25 8-26 17Z" fill="currentColor" opacity=".65"/>
    </>}
   </svg>
  </div>
  <div className={styles.cardContent}><h2>{title}</h2><div className={styles.cardDivider} aria-hidden="true">✦</div><p>{message}</p></div>
  <div className={styles.cardSignature} aria-hidden="true">{design === 'sunrise' ? '☀' : design === 'evening' ? '✧' : '♡'}</div>
 </article>;
}

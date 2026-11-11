import { COZY_SPIRIT_AFFILIATE_URL } from "../lib/affiliatePromotions";
import styles from "./AffiliatePromotion.module.css";

export default function AffiliatePromotion() {
  return <aside className={styles.card} aria-label="Advertisement: CozySpiritStudio">
    <div className={styles.feature}>
      <div className={styles.copy}>
        <span className={styles.label}>ADVERTISEMENT</span>
        <span className={styles.eyebrow}>In the spotlight</span>
        <strong className={styles.title}>CozySpirit<wbr />Studio</strong>
        <p className={styles.description}>A little browsing. A new discovery.</p>
      </div>
      <div className={styles.action}>
        <span className={styles.storeLabel}>Explore their online store</span>
        <a className={styles.link} href={COZY_SPIRIT_AFFILIATE_URL} target="_blank" rel="sponsored noopener noreferrer" referrerPolicy="no-referrer">Visit CozySpiritStudio <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>
      </div>
    </div>
    <p className={styles.disclosure}>Family Weather may earn a commission if you buy through this link.</p>
  </aside>;
}

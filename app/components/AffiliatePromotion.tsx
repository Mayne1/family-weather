import { COZY_SPIRIT_AFFILIATE_URL } from "../lib/affiliatePromotions";
import styles from "./AffiliatePromotion.module.css";

export default function AffiliatePromotion() {
  return <aside className={styles.card} aria-label="Advertisement: CozySpiritStudio">
    <div className={styles.copy}>
      <span className={styles.label}>ADVERTISEMENT · AFFILIATE PARTNER</span>
      <strong className={styles.title}>Discover CozySpiritStudio</strong>
      <p className={styles.description}>Take a look around our partner’s online store.</p>
      <p className={styles.disclosure}>Family Weather may earn a commission if you buy through this link.</p>
    </div>
    <a className={styles.link} href={COZY_SPIRIT_AFFILIATE_URL} target="_blank" rel="sponsored noopener noreferrer" referrerPolicy="no-referrer">Browse the store <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>
  </aside>;
}

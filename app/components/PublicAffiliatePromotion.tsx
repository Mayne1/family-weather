"use client";
import { usePathname } from "next/navigation";
import { supportsPublicAffiliate } from "../lib/affiliatePromotions";
import AffiliatePromotion from "./AffiliatePromotion";

export default function PublicAffiliatePromotion() {
  const pathname = usePathname();
  return supportsPublicAffiliate(pathname) ? <AffiliatePromotion /> : null;
}

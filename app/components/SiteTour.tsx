"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./SiteTour.module.css";

const STORAGE_KEY = "family-weather-tour-v1";
const steps = [
  { target: "current", title: "Your weather, right here", text: "This bar shows current conditions. Use my location switches it to your area. You can look up a different destination in the planner.", href: "/today", link: "Open today’s weather" },
  { target: "planner", title: "Tell us what you’re planning", text: "Enter an activity, a place, and a date here. The planner explains the weather fit, useful hours, and cautions. No account needed.", href: "/plan", link: "Try the planner" },
  { target: "forecast", title: "Look at the days ahead", text: "These cards show the coming days. Open a day for more detail before deciding when to make your plans.", href: "/today", link: "See the full forecast" },
  { target: "history", title: "Planning weeks or months ahead?", text: "Start here to compare your date across five previous years. That shows historical patterns—not a promise of future weather.", href: "/weather-history", link: "Explore weather history" },
  { target: "announcements", title: "Share a quick update", text: "Create a free announcement and share its link. People can read it and leave a named reply without signing in. Optional text packs let Family Weather send the link for you.", href: "/announcements", link: "Create an announcement" },
  { target: "invitations", title: "Invite people when you’re ready", text: "This opens event creation. Choose an invitation design, then share the link yourself. An account saves your events; pricing explains the paid options.", href: "/create-event", link: "Explore invitations" },
  { target: "help", title: "Come back whenever you need", text: "Show me around is here in the footer. Replay this tour anytime, or open FAQ for more answers.", href: "/faq", link: "Read the FAQ" },
];
type Position = { left: number; top: number; width: number; height: number; cardLeft: number; cardTop: number; below: boolean };

export default function SiteTour({ firstVisit = false }: { firstVisit?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnScroll = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  function open() {
    if (!document.querySelector('[data-tour="current"]')) { window.location.assign("/?tour=1"); return; }
    returnScroll.current = window.scrollY;
    setStep(0); setActive(true);
  }
  function close(restore = true) {
    try { localStorage.setItem(STORAGE_KEY, "seen"); } catch { /* Storage is optional. */ }
    setActive(false); dialog.current?.close();
    if (restore) { window.scrollTo({ top: returnScroll.current, behavior: "instant" }); trigger.current?.focus({ preventScroll: true }); }
  }
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || !firstVisit) return;
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("tour") === "1";
    if (requested) { url.searchParams.delete("tour"); window.history.replaceState(null, "", url); }
    try { if (!requested && localStorage.getItem(STORAGE_KEY)) return; } catch { if (!requested) return; }
    returnScroll.current = window.scrollY; setActive(true);
  }, [mounted, firstVisit]);
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${window.innerHeight}px`;
    return () => { document.body.style.paddingBottom = previous; };
  }, [active]);
  useEffect(() => {
    if (!active) return;
    dialog.current?.showModal();
    const target = document.querySelector<HTMLElement>(`[data-tour="${steps[step].target}"]`);
    if (!target) return;
    setPosition(null);
    // Instant scrolling keeps the spotlight and the page synchronized, including reduced-motion users.
    const top = window.scrollY + target.getBoundingClientRect().top - 64;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    const place = () => {
      const rect = target.getBoundingClientRect();
      const w = window.innerWidth, h = window.innerHeight;
      const cw = Math.min(410, w - 24), ch = card.current?.offsetHeight || 350;
      let cx = w - cw - 20, cy = Math.max(16, Math.min(rect.top, h - ch - 16));
      const rightSpace = w - rect.right;
      const leftSpace = rect.left;
      let below = false;
      if (w >= 900 && rightSpace > cw + 32) cx = rect.right + 20;
      else if (w >= 900 && leftSpace > cw + 32) cx = rect.left - cw - 20;
      else { cx = Math.max(12, (w - cw) / 2); cy = h - ch - 12; below = true; }
      setPosition({ left: Math.max(5, rect.left - 5), top: Math.max(5, rect.top - 5), width: Math.min(w - 10, rect.width + 10), height: Math.max(0, Math.min(rect.bottom + 5, h - 5) - Math.max(5, rect.top - 5)), cardLeft: cx, cardTop: Math.max(12, cy), below });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(target); if (card.current) observer.observe(card.current);
    window.addEventListener("resize", place); window.addEventListener("scroll", place);
    heading.current?.focus({ preventScroll: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place); };
  }, [active, step]);
  const current = steps[step];
  return <>
    <button ref={trigger} className={styles.trigger} type="button" onClick={open}>Show me around</button>
    {mounted && createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby="site-tour-title" aria-describedby="site-tour-description" onCancel={event => { event.preventDefault(); close(); }}>
      {active && <>
        {position && <div className={styles.spotlight} aria-hidden="true" style={{ left: position.left, top: position.top, width: position.width, height: position.height }}><span className={styles.marker}>{step + 1}</span></div>}
        <div ref={card} className={styles.card} style={{ left: position?.cardLeft ?? 12, top: position?.cardTop ?? 12, visibility: position ? "visible" : "hidden" }}>
          <div className={styles.top}><span>YOUR QUICK TOUR · {step + 1} OF {steps.length}</span><button type="button" onClick={() => close()} aria-label="Close tour">×</button></div>
          <div className={styles.pointing} aria-hidden="true">{position?.below ? "↑" : position && position.cardLeft > position.left ? "←" : "→"} LOOK FOR THE GOLD OUTLINE</div>
          <h2 ref={heading} tabIndex={-1} id="site-tour-title">{current.title}</h2>
          <p id="site-tour-description">{current.text}</p>
          <a className={styles.link} href={current.href} onClick={() => close(false)}>{current.link} →</a>
          <div className={styles.controls}><button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</button><button type="button" onClick={() => close()}>Skip</button><button className={styles.next} type="button" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? "Done" : "Next →"}</button></div>
        </div>
      </>}
    </dialog>, document.body)}
  </>;
}

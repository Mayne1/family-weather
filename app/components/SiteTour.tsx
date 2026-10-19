"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SiteTour.module.css";

const STORAGE_KEY = "family-weather-tour-v1";
const steps = [
  { title: "Welcome to Family Weather", text: "Check the weather for what you actually want to do. Start with an activity, a place, and a date. You can use the planning tools without an account.", href: "/plan", link: "Open the activity planner" },
  { title: "Find a useful weather window", text: "Describe your plan—yard work, a beach day, dinner outside—and choose indoors, outdoors, or both. Read the reasons and cautions alongside the weather-fit score. A score is guidance, not a guarantee.", href: "/plan", link: "Try an activity" },
  { title: "See the weather now", text: "Today shows current conditions and the forecast. On the homepage, choose Use my location to update your local weather. The activity planner also lets you look up another destination.", href: "/today", link: "See today’s weather" },
  { title: "Planning further ahead?", text: "Weather history compares your chosen calendar date across five previous years. Use it to understand past patterns when your plans are beyond the forecast range. Historical weather is not a forecast.", href: "/weather-history", link: "Explore weather history" },
  { title: "Bring people into the plan", text: "Create an event, choose an invitation design, and share its link through your own text, email, or social apps. Sign in to save and manage your events. Pricing explains the paid options before you purchase.", href: "/create-event", link: "Explore invitations" },
  { title: "You can come back to this tour", text: "Choose Show me around in the footer whenever you want another walkthrough. FAQ and How it works explain the tools in more detail.", href: "/faq", link: "Read the FAQ" },
];

export default function SiteTour({ firstVisit = false }: { firstVisit?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  function open() { setStep(0); dialog.current?.showModal(); }
  function close() {
    try { localStorage.setItem(STORAGE_KEY, "seen"); } catch { /* Tour also works without storage. */ }
    dialog.current?.close();
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!firstVisit) return;
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { return; }
    dialog.current?.showModal();
  }, [firstVisit]);
  useEffect(() => { if (dialog.current?.open) heading.current?.focus(); }, [step]);
  const current = steps[step];
  return <>
    <button ref={trigger} className={styles.trigger} type="button" onClick={open}>Show me around</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="site-tour-title" aria-describedby="site-tour-description" onCancel={event => { event.preventDefault(); close(); }}>
      <div className={styles.top}><span>FAMILY WEATHER · {step + 1} OF {steps.length}</span><button type="button" onClick={close} aria-label="Close tour">×</button></div>
      <h2 ref={heading} tabIndex={-1} id="site-tour-title">{current.title}</h2>
      <p id="site-tour-description">{current.text}</p>
      <a className={styles.link} href={current.href} onClick={close}>{current.link} →</a>
      <div className={styles.controls}><button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</button><button type="button" onClick={close}>Skip tour</button><button className={styles.next} type="button" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? "Done" : "Next →"}</button></div>
    </dialog>
  </>;
}

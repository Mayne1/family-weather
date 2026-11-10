"use client";

/* Full navigation keeps public advertising scripts out of private event pages. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getValidSession, sendPasswordReset, signIn, signOut, signUp } from "../lib/firebaseAuth";
import type { AuthSession } from "../lib/firebaseAuth";
import styles from "../design-preview/preview.module.css";

export default function HomeAccount() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedMode = url.searchParams.get("account");
    if (requestedMode !== "signin" && requestedMode !== "signup") return;
    setMode(requestedMode);
    setError("");
    setNotice(""); dialog.current?.showModal();
    url.searchParams.delete("account");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  useEffect(() => {
    let active = true;
    const sync = () => { void getValidSession().then(value => { if (active) { setSession(value); setReady(true); } }); };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => { active = false; window.removeEventListener("focus", sync); window.removeEventListener("storage", sync); };
  }, []);
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const email = String(values.get("email") || "").trim();
      if (mode === "reset") {
        await sendPasswordReset(email);
        setNotice("If an account uses that address, Firebase has sent its password-reset email. Check the inbox and spam folder.");
        return;
      }
      const password = String(values.get("password") || "");
      setSession(await (mode === "signin" ? signIn(email, password) : signUp(email, password)));
      form.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Account access failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className={styles.accountButton} disabled={!ready} onClick={() => { setMode("signin"); setError(""); setNotice(""); dialog.current?.showModal(); }}>
      <span className={styles.accountDot} data-signed-in={!!session} />{!ready ? "Checking account…" : session ? "Signed in · Account" : "Sign in"}
    </button>
    <dialog ref={dialog} className={styles.accountDialog} aria-labelledby="home-account-title">
      <button type="button" className={styles.dialogClose} aria-label="Close account box" onClick={() => dialog.current?.close()}>×</button>
      <p className={styles.kicker}>FAMILY WEATHER ACCOUNT</p>
      <h2 id="home-account-title">{session ? "You’re signed in." : mode === "signin" ? "Welcome back." : mode === "signup" ? "Make yourself at home." : "Reset your password."}</h2>
      {session ? <div className={styles.accountDetails}><p>Signed in as <strong>{session.email}</strong></p><a className={styles.planButton} href="/events">Open My Events →</a><button type="button" onClick={() => { signOut(); setSession(null); setMode("signin"); setError(""); }}>Sign out</button></div> : <form onSubmit={authenticate}>
        <p>{mode === "signin" ? "Sign in to your saved events and invitations." : mode === "signup" ? "Create your account to save events and manage replies." : "Enter your account email. Firebase will send the secure reset link."}</p>
        <label htmlFor="home-auth-email">Email address</label><input id="home-auth-email" name="email" type="email" autoComplete="email" required disabled={busy}/>
        {mode !== "reset" ? <><label htmlFor="home-auth-password">Password</label><input id="home-auth-password" name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={mode === "signup" ? 6 : undefined} required disabled={busy}/></> : null}
        {error ? <p className={styles.authError} role="alert">{error}</p> : null}
        {notice ? <p className={styles.authNotice} role="status">{notice}</p> : null}
        <button className={styles.planButton} disabled={busy}>{busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}</button>
        {mode === "signin" ? <button className={styles.forgotPassword} type="button" disabled={busy} onClick={() => { setMode("reset"); setError(""); setNotice(""); }}>Forgot password?</button> : null}
        <button className={styles.authSwitch} type="button" disabled={busy} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>{mode === "signin" ? "New here? Sign up" : mode === "signup" ? "Already have an account? Sign in" : "Back to sign in"}</button>
      </form>}
    </dialog>
  </>;
}

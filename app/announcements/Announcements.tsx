"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { getValidSession, signIn, signUp, type AuthSession } from "../lib/firebaseAuth";
import styles from "./announcements.module.css";
import { announcementDesigns } from "./designs";
import AnnouncementCard from "./AnnouncementCard";
import EmojiPicker from "./EmojiPicker";
import ReplyNotifications from "../components/ReplyNotifications";
import NativeShare from "../components/NativeShare";
type Item={id:string;title:string;message:string;theme:string;closed:boolean};
type Reply={id:string;name:string;message:string;created_at:string};
export default function Announcements(){
 const[session,setSession]=useState<AuthSession|null>(null),[signup,setSignup]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null),[replies,setReplies]=useState<Reply[]>([]);
 const messageInput=useRef<HTMLTextAreaElement>(null);
 function addEmoji(emoji:string){const input=messageInput.current;const start=input?.selectionStart??message.length;const end=input?.selectionEnd??start;const next=message.slice(0,start)+emoji+message.slice(end);if(next.length>4000)return;setMessage(next);requestAnimationFrame(()=>{input?.focus();input?.setSelectionRange(start+emoji.length,start+emoji.length)});}
 const[title,setTitle]=useState(''),[message,setMessage]=useState(''),[theme,setTheme]=useState('forest');
 async function api(path='',data?:unknown){const s=await getValidSession();if(!s)throw new Error('Sign in to manage your announcements.');const response=await fetch('/api/announcements'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.idToken}`},body:data?JSON.stringify(data):undefined});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');return result;}
 async function refresh(){const data=await api();setItems(data.announcements);}
 async function view(id:string){const data=await api(`/${id}/manage`);setSelected(data.announcement);setReplies(data.replies);}
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}}
 useEffect(()=>{getValidSession().then(async s=>{setSession(s);if(s){try{await refresh();const target=new URLSearchParams(window.location.search).get("announcement");if(target&&/^[a-f0-9]{32}$/.test(target))await view(target)}catch(e){setError(e instanceof Error?e.message:'Could not load announcements.')}}})},[]);
 async function login(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);await run(async()=>{const s=await(signup?signUp:signIn)(String(data.get('email')),String(data.get('password')));setSession(s);await refresh();const target=new URLSearchParams(window.location.search).get("announcement");if(target&&/^[a-f0-9]{32}$/.test(target))await view(target)});}
 const link=selected?`https://thefamilyweather.com/a/${selected.id}`:'';
 return <main className={styles.page}><p>SHARE A LITTLE NEWS</p><h1>One announcement. One link.</h1><p>A family update, a quick hello, or a last-minute plan. Share it for free. People can read it and leave you a reply without an account.</p>
 {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.message} role="status">{notice}</p>}
 {!session?<div className={styles.grid}><form className={styles.box} onSubmit={login}><h2>{signup?'Create your free account':'Sign in to save your announcements'}</h2><p>Only the creator needs an account. Your recipients do not.</p><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength={6} required autoComplete={signup?'new-password':'current-password'}/></label><button disabled={busy}>{signup?'Create account':'Sign in'}</button><button type="button" onClick={()=>setSignup(!signup)}>{signup?'Already have an account?':'Create a free account'}</button></form><div><AnnouncementCard theme="sunrise" title="A little sunshine for you" message="Good morning, family! Just sending a little love your way. Hope today gives you something to smile about. 💛"/><p className={styles.small}>Example announcement</p></div></div>:<>
 <div className={styles.grid}><form className={styles.box} onSubmit={e=>{e.preventDefault();void run(async()=>{const data=await api('',{title,message,theme});await refresh();await view(data.id);setNotice('Your announcement is ready. Share it or copy the link below.');})}}><h2>Create an announcement · Free</h2><label>Design<select value={theme} onChange={e=>setTheme(e.target.value)}>{announcementDesigns.map(design=><option key={design.id} value={design.id}>{design.label}</option>)}</select></label><label>Title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="A quick family update"/></label><label>Your message<textarea ref={messageInput} required maxLength={4000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What would you like everyone to know?"/></label><EmojiPicker onSelect={addEmoji}/><p className={styles.small}>Anyone with the link can read and forward it. Replies are visible to you, the creator.</p><button disabled={busy}>Create my free link</button></form><div><h2>Preview</h2><AnnouncementCard theme={theme} title={title||'Your announcement title'} message={message||'Your message will appear here.'}/></div></div>
 <ReplyNotifications/>
 <section className={styles.box}><h2>Your announcements</h2>{items.length?items.map(a=><button type="button" key={a.id} disabled={busy} onClick={()=>void run(()=>view(a.id))}>{a.title}{a.closed?' · Closed':''}</button>):<p>No announcements yet.</p>}</section>
 {selected&&<section className={styles.box}><h2>{selected.title}</h2>{selected.closed?<p>This announcement is closed.</p>:<><label>Free shareable link<input readOnly value={link} onFocus={e=>e.target.select()}/></label><NativeShare key={selected.id} kind="announcement" title={selected.title} url={link} /><a className={styles.button} href={link} target="_blank" rel="noreferrer">View announcement</a><button type="button" disabled={busy} onClick={()=>{if(window.confirm('Close this announcement? Its link will no longer show the message or accept replies.'))void run(async()=>{await api(`/${selected.id}/close`,{});await view(selected.id);await refresh()})}}>Close announcement</button>

 </>}
 <hr/><h2>Replies · {replies.length}</h2><button disabled={busy} onClick={()=>void run(()=>view(selected.id))}>Refresh replies</button>{replies.length?replies.map(r=><div className={styles.reply} key={r.id}><strong>{r.name}</strong><p>{r.message}</p><small>{new Date(r.created_at).toLocaleString()}</small></div>):<p>Replies will appear here when people check in.</p>}</section>}
 </>}
 </main>
}

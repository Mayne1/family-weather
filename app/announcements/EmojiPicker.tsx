"use client";
import {useState} from 'react';
import styles from './announcements.module.css';
const groups:Record<string,string[]>={
 'Favorites':['💛','❤️','😊','🤗','☀️','🌸','🎉','🙏','✨','🌙','🥰','💕'],
 'Faces':['😀','😃','😁','😆','😂','🤣','🙂','😉','😍','😘','😎','🥳','🥹','😢','😭','😴','🤔','🙄','😇','🤩','😅','😋','🤒','🤕'],
 'Love & support':['❤️','🧡','💛','💚','💙','💜','🩷','🤍','🤎','🖤','💖','💗','💞','💓','💝','💌','🫶','🤗','🙏','💐','🌹','🕊️','🫂','💪'],
 'Celebrate':['🎉','🎊','🎈','🎂','🎁','🥂','🍾','🏆','👏','🙌','👍','✌️','🤞','🤝','💯','⭐','🌟','✨','🎶','🎵','💃','🕺','🪩','🎓'],
 'Everyday':['☀️','🌤️','⛅','🌧️','⛈️','🌈','❄️','🌬️','🌙','🌻','🌸','🌴','🍂','🏖️','☕','🍵','🍰','🍕','🍔','🍌','🏡','🚗','✈️','🏥']
};
export default function EmojiPicker({onSelect}:{onSelect:(emoji:string)=>void}){
 const[group,setGroup]=useState('Favorites');
 return <div className={styles.emojiTray}><span>Add a little personality</span><div className={styles.emojiTabs} role="group" aria-label="Emoji categories">{Object.keys(groups).map(g=><button type="button" key={g} aria-pressed={g===group} onClick={()=>setGroup(g)}>{g}</button>)}</div><div role="group" aria-label={`${group} emojis`}>{groups[group].map((e,i)=><button key={i} type="button" aria-label={`Insert ${e}`} onClick={()=>onSelect(e)}>{e}</button>)}</div></div>;
}

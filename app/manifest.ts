import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {
 id:'/',name:'Family Weather',short_name:'Family Weather',description:'Weather, invitations and announcement replies.',
 start_url:'/announcements',scope:'/',display:'standalone',background_color:'#071b25',theme_color:'#071b25',
 icons:[{src:'/notification-icon-192.png',sizes:'192x192',type:'image/png'},{src:'/notification-icon-512.png',sizes:'512x512',type:'image/png'}]
};}

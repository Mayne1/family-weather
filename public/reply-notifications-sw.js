/* Notifications only: no fetch handler, no caching of private pages or API data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
 let data={};try{data=event.data?.json()||{};}catch{}
 event.waitUntil((async()=>{
  await self.registration.showNotification('Family Weather',{
   body:data.body||'Someone responded. Open Family Weather to read the reply.',
   icon:'/notification-icon-192.png',badge:'/notification-icon-192.png',
   tag:data.tag||'family-weather-reply',data:{url:data.url||'/events'}
  });
  if(self.navigator.setAppBadge)await self.navigator.setAppBadge().catch(()=>{});
 })());
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async()=>{
  let url=new URL('/events',self.location.origin);
  try{
   const proposed=new URL(event.notification.data?.url||'/events',self.location.origin);
   if(proposed.origin===self.location.origin && (proposed.pathname==='/announcements'||/^\/events\/[0-9]+$/.test(proposed.pathname)))url=proposed;
  }catch{}
  if(self.navigator.clearAppBadge)await self.navigator.clearAppBadge().catch(()=>{});
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){if(new URL(client.url).origin===self.location.origin){const navigated=await client.navigate(url.href);if(navigated){await navigated.focus();return;}}}
  await self.clients.openWindow(url.href);
 })());
});

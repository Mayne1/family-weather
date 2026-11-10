export type ResponseWidgetSummary = {
  announcements: number; announcementReplies: number; events: number;
  going: number; maybe: number; declined: number; waiting: number;
  partial: boolean; checkedAt: number;
};
type SummaryPayload = {
  announcements?: {id:string}[]; events?: {id:string}[];
  replies?: unknown[]; details?: {response?:string|null}[];
};
type Request = (path: string) => Promise<SummaryPayload>;
export async function collectResponseWidgetSummary(request: Request, now = Date.now()): Promise<ResponseWidgetSummary> {
  const [announcements, events] = await Promise.all([request('/api/announcements'), request('/api/events')]);
  if (!Array.isArray(announcements.announcements) || !Array.isArray(events.events)) throw new Error('Response summary unavailable');
  const result: ResponseWidgetSummary = {announcements:announcements.announcements.length,announcementReplies:0,events:events.events.length,going:0,maybe:0,declined:0,waiting:0,partial:false,checkedAt:now};
  // Bound the number of existing owner-only API calls; large accounts are explicitly marked partial.
  result.partial = result.announcements > 20 || result.events > 20 || result.announcements >= 100 || result.events >= 100;
  const jobs = [
    ...announcements.announcements.slice(0,20).map((a: {id:string})=>async()=>{
      const data=await request(`/api/announcements/${encodeURIComponent(a.id)}/manage`);
      if(!Array.isArray(data.replies))throw new Error('Announcement replies unavailable');
      result.announcementReplies+=data.replies.length;
      if(data.replies.length>=500)result.partial=true;
    }),
    ...events.events.slice(0,20).map((e: {id:string})=>async()=>{
      const data=await request(`/api/events/${encodeURIComponent(e.id)}/rsvp-details`);
      if(!Array.isArray(data.details))throw new Error('Invitation responses unavailable');
      for(const row of data.details){
        if(row.response==='yes')result.going++;
        else if(row.response==='maybe')result.maybe++;
        else if(row.response==='no')result.declined++;
        else result.waiting++;
      }
    })
  ];
  let index=0;
  await Promise.all(Array.from({length:3},async()=>{while(index<jobs.length)await jobs[index++]();}));
  return result;
}

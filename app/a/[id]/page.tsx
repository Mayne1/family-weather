import type { Metadata } from "next";
import AnnouncementReader from "./reader";
export const metadata:Metadata={title:"Tap to open this announcement | Family Weather",robots:{index:false,follow:false},openGraph:{title:"Tap to open this announcement",description:"Read the Family Weather announcement and leave the sender a reply.",images:[]}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <AnnouncementReader id={(await params).id}/>}

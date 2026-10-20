import type { Metadata } from "next";
import AnnouncementReader from "./reader";
export const metadata:Metadata={title:"An announcement for you | Family Weather",robots:{index:false,follow:false},openGraph:{title:"An announcement for you",description:"Open the link to read and reply.",images:[]}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <AnnouncementReader id={(await params).id}/>}

import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";
import Announcements from "./Announcements";
export const metadata: Metadata={title:"Announcements | Family Weather",robots:{index:false,follow:false}};
export default function Page(){return <PublicChrome><Announcements/></PublicChrome>}

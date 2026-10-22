import type {Metadata} from "next";
import Preferences from "./preferences";
export const metadata:Metadata={title:"Text preferences | Family Weather",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Page({params}:{params:Promise<{token:string}>}){return <Preferences token={(await params).token}/>}

import type {Metadata} from "next";
import Signup from "./signup";
export const metadata:Metadata={title:"Choose your texts | Family Weather",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Page({params}:{params:Promise<{token:string}>}){return <Signup token={(await params).token}/>}

import type { Metadata } from 'next';
import FamilyAccess from './FamilyAccess';
export const metadata: Metadata={title:'Family Access | Family Weather',robots:{index:false,follow:false}};
export default function Page(){return <FamilyAccess/>;}

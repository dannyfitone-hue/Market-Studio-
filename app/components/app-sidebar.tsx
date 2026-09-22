import Link from "next/link";
import { Home, LayoutDashboard, PlusCircle, ShieldCheck } from "lucide-react";
import { SignOut } from "./sign-out";

export function AppSidebar({active, admin=false, adminAccess=false}:{active:string; admin?:boolean; adminAccess?:boolean}) {
  const items = admin ? [["CRM","/admin",LayoutDashboard],["Client view","/dashboard",Home]] as const : [["Overview","/dashboard",Home],["New order","/onboarding",PlusCircle]] as const;
  return <aside className="app-sidebar"><Link href="/" className="brand"><span className="brand-mark">M</span><span>MARKET STUDIO</span></Link><nav className="app-nav">{items.map(([label,href,Icon])=><Link className={label===active?"active":""} href={href} key={label}><Icon size={17}/>{label}</Link>)}</nav>{!admin&&adminAccess&&<Link href="/admin" className="admin-link"><ShieldCheck size={16}/> Admin CRM</Link>}<div className="app-sidebar-bottom"><SignOut/></div></aside>
}

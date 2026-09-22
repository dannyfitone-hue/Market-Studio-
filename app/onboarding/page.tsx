import { requireChatGPTUser } from "../chatgpt-auth";
import { AppSidebar } from "../components/app-sidebar";
import { OrderWizard } from "./wizard";
export const dynamic = "force-dynamic";
export default async function Onboarding(){const user=await requireChatGPTUser("/onboarding");return <div className="app-frame"><AppSidebar active="New order"/><main className="app-main"><header className="app-header"><div><h1>Start a new project</h1><p>Submit your brief, upload assets, and place your order.</p></div></header><OrderWizard email={user.email}/></main></div>}

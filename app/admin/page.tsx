import { requireMarketStudioAdmin } from "../chatgpt-auth";
import { AppSidebar } from "../components/app-sidebar";
import { CRMList } from "./crm-list";
export const dynamic="force-dynamic";
export default async function Admin(){await requireMarketStudioAdmin("/admin");const stripeReady=Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.STRIPE_PRICE_SOCIAL_AD&&process.env.STRIPE_PRICE_PRODUCT_SHOWCASE&&process.env.STRIPE_PRICE_3D_REVEAL);return <div className="app-frame"><AppSidebar active="CRM" admin/><main className="app-main"><header className="app-header"><div><h1>Admin CRM</h1><p>Every client, payment, brief, production update, and final delivery.</p></div></header><CRMList stripeReady={stripeReady}/></main></div>}

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { safeReturnPath } from "../../chatgpt-auth";
export default async function SignInPage({searchParams}:{searchParams:Promise<{return_to?:string}>}) {
  const query=await searchParams;
  return <main className="auth-page"><Link href="/" className="brand"><span className="brand-mark">M</span><span>MARKET STUDIO</span></Link><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl={safeReturnPath(query.return_to || "/dashboard")}/></main>;
}

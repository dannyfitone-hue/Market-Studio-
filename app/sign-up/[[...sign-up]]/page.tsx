import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
export default function SignUpPage() {
  return <main className="auth-page"><Link href="/" className="brand"><span className="brand-mark">M</span><span>MARKET STUDIO</span></Link><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard"/></main>;
}

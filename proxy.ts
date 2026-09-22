import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();
export const config={matcher:["/((?!_next|marketing|favicon.svg|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|woff2?|ico)).*)","/api/(.*)"]};

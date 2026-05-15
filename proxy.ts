import { auth } from "@/auth"

// Optional middleware to enforce authentication
// Since we manually protected page.tsx, this is just for future-proofing
export default auth((req) => {
  // You can add custom routing logic here based on req.auth
})

export const config = {
  // Ensure the middleware is only called for relevant paths
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

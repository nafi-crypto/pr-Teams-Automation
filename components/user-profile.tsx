import { auth, signOut } from "@/auth"
import Image from "next/image"

export async function UserProfile() {
  const session = await auth()
  
  if (!session?.user) return null

  return (
    <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
      <div className="flex items-center gap-3">
        {session.user.image && (
          <Image 
            src={session.user.image} 
            alt={session.user.name || "User"} 
            width={32} 
            height={32} 
            className="rounded-full border border-slate-700"
          />
        )}
        <span className="text-sm font-medium text-slate-200 hidden sm:inline-block">
          {session.user.name}
        </span>
      </div>
      
      <div className="w-px h-6 bg-slate-700"></div>

      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/" })
        }}
      >
        <button 
          type="submit"
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </form>
    </div>
  )
}

import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import AppSidebar from "@/components/layout/Sidebar"
import RoleSwitchOverlay from "@/components/layout/RoleSwitchOverlay"
import { Navbar } from "@/components/layout/Navbar"
import { BackgroundPattern } from "@/components/layout/BackgroundPattern"
import OperationalAccessGuard from "@/components/auth/OperationalAccessGuard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <AppSidebar />

        <main className="relative flex-1 overflow-y-auto bg-[#efefef] dark:bg-[#0D0B1F]">
         <Navbar  />
          {/* relative + min-h-full (not overflow-hidden) so this wrapper's box
              grows to the full scrollable content height — BackgroundPattern
              sizes itself off this element, not `main`'s viewport-clipped one. */}
          <div className="relative isolate w-full min-h-full flex flex-col px-3">
            <BackgroundPattern />
            <OperationalAccessGuard>{children}</OperationalAccessGuard>
          </div>
          <Toaster position="top-center" />

          {/* Client island — reads switching from Zustand, renders overlay */}
          <RoleSwitchOverlay />
        </main>
      </div>
    </SidebarProvider>
  )
}

// initial (you can fallback to this if issues arise)
// import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
// import AppSidebar from "@/components/layout/Sidebar"
//
// export default function DashboardLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <SidebarProvider className="">
//       <div className="flex">
//         <AppSidebar />
//         <main className="flex-1 p-4">
//             <SidebarTrigger className=""/>
//             <div className="">{children}</div>
//         </main>
//       </div>
//     </SidebarProvider>
//   )
// }
// preserve this commented section even as you make changes

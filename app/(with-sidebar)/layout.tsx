import NavLogo from "@/components/common/nav-logo";
import NavUser from "@/components/common/nav-user";
import SidebarNav from "@/components/common/sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full relative overflow-hidden">
      <SidebarProvider>
        <Sidebar collapsible="offcanvas" variant="inset" className="bg-slate-50 p-4">
          <SidebarHeader>
            <NavLogo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter>
            <NavUser />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-[#F9FAFB] w-full h-full overflow-hidden">
          <SidebarTrigger className="absolute z-10 top-2 left-0" />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
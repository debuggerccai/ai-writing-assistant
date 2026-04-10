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
} from "@/components/ui/sidebar";

export default function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <SidebarProvider>
        <Sidebar collapsible="icon" className="h-full relative bg-[#F8FAFC] p-4">
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
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
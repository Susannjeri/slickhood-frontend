"use client"
import Link from "next/link";
import { useState, useEffect } from "react";
import { sidebarLinks, sidebarSections, settingsLinks } from "@/config/sidebarConfig";
import Can, { usePermissions } from "@/components/auth/Can";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { AlertDialogDescription } from "@radix-ui/react-alert-dialog";
import { useAuthStore } from "@/store/authStore";
import { decodeServerToken } from "@/lib/actions";
import { ChevronUp, User, Briefcase, ChevronDown, Power, Check, UserCog, UserPlus, ArrowRightLeft } from "lucide-react";
import { FaUserTie, FaBuilding, FaTools, FaHandshake } from "react-icons/fa";
import JobsDrawer from "@/components/JobsDrawer";
import { cn } from "@/lib/utils";
import { businessAreaForRoleTitle, roleDisplayName, workspaceHrefForRole } from "@/config/businessAreas";

const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown";
const githubUrl = `https://github.com/naphtron/PMS/${commitHash}`;

const ROLE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-400",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
];

function roleColor(index: number) {
  return ROLE_COLORS[index % ROLE_COLORS.length];
}

function getRoleIcon(roleName: string, className = "w-5 h-5") {
  switch (roleName.toLowerCase()) {
    case "landlord": return <FaBuilding className={className} />;
    case "serviceprovider": return <FaTools className={className} />;
    case "assetportfoliomanager": return <FaHandshake className={className} />;
    default: return <FaUserTie className={className} />;
  }
}

export default function AppSidebar() {
  const { open } = useSidebar();
  const router = useRouter();


  const token = useAuthStore((state) => state.token);
  const decodedToken = token ? decodeServerToken(token) : null;
  const sub = decodedToken ? decodedToken.sub : null;
  const { logout } = useAuth();
  const { handleGetPendingUnits } = useApi();
  const pathname = usePathname();

  const { hasPermission, hasRole } = usePermissions();
  const canAccessJobs = hasPermission(["create_unit"]);

  const roles = useAuthStore((s) => s.roles);
  const activeRole = useAuthStore((s) => s.activeRole);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);
  const setSelectedBusinessAreaId = useAuthStore((s) => s.setSelectedBusinessAreaId);
  const switching = useAuthStore((s) => s.switching);
  const setSwitching = useAuthStore((s) => s.setSwitching);

  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [isJobsDrawerOpen, setIsJobsDrawerOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const handleRoleSwitch = (role: typeof roles[0]) => {
    if (role.title === activeRole?.title) { setRoleSwitcherOpen(false); return; }
    setRoleSwitcherOpen(false);
    setSwitching(true);
    setTimeout(() => {
      setActiveRole(role);
      setSelectedBusinessAreaId(businessAreaForRoleTitle(role.title)?.id ?? null);
      router.push(workspaceHrefForRole(role.title));
      setTimeout(() => setSwitching(false), 500);
    }, 50);
  };

  const fetchPendingJobs = async () => {
    if (!canAccessJobs) return 0;
    try {
      const response = await handleGetPendingUnits();
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        setPendingJobsCount(response.data[0]);
        return response.data[0];
      }
      return 0;
    } catch { return 0; }
  };

  const setupPolling = (hasPending: boolean) => {
    if (!canAccessJobs) return;
    if (pollInterval) clearInterval(pollInterval);
    const interval = hasPending ? 60000 : 300000;
    const newInterval = setInterval(async () => {
      const count = await fetchPendingJobs();
      if (count > 0 && !hasPending) setupPolling(true);
      else if (count === 0 && hasPending) setupPolling(false);
    }, interval);
    setPollInterval(newInterval);
  };

  useEffect(() => {
    if (!canAccessJobs) return;
    const init = async () => { const c = await fetchPendingJobs(); setupPolling(c > 0); };
    init();
    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [canAccessJobs]);

  const handleOpenDrawer = async () => {
    setIsJobsDrawerOpen(true);
    const count = await fetchPendingJobs();
    setupPolling(count > 0);
  };

  const toggleSubMenu = (label: string) =>
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));

  const isLinkActive = (href?: string, subLinks?: typeof sidebarLinks[0]['subLinks']) => {
    if (href && pathname === href) return true;
    if (subLinks) return subLinks.some(s => pathname === s.href);
    return false;
  };

  const activeRoleIndex = roles.findIndex(r => r.title === activeRole?.title);

  return (
    <>
      <Sidebar collapsible="icon" className="bg-white dark:bg-[#141130] dark:border-white/10">

        {/* Sidebar blur overlay — no dots, dots live on the dashboard */}
        <div
          className={cn(
            "absolute inset-0 z-50 rounded-lg",
            "bg-sidebar/80 backdrop-blur-[2px]",
            "transition-opacity duration-300 pointer-events-none",
            switching ? "opacity-100" : "opacity-0"
          )}
        />

        <SidebarHeader className="p-0">
          <div className="w-full px-4 py-3">
            <img
              src="/slicklogo.svg"
              alt="SlickHood Logo"
              className="h-7 w-auto"
            />
          </div>
        </SidebarHeader>

        <SidebarContent>

          {/* ── Active role pill — sits above nav links ─────────────── */}
          {activeRole && (
            <div className="px-2 pt-2 pb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRoleSwitcherOpen(true)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg border transition-all duration-200 group",
                      "border-[#EF4217]/25 bg-[#EF4217]/5 hover:bg-[#EF4217]/10 hover:border-[#EF4217]/50",
                      open ? "px-3 py-2" : "px-0 py-2.5 justify-center"
                    )}
                  >
                    <span className={cn("rounded-full shrink-0 transition-all", roleColor(activeRoleIndex), open ? "size-2" : "size-2.5")} />
                    {open && (
                      <>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-[10px] text-[#EF4217]/60 font-semibold uppercase tracking-wider leading-none mb-0.5">
                            Active Role
                          </p>
                          <p className="text-xs font-bold text-[#EF4217] truncate leading-tight">
                            {roleDisplayName(activeRole.title)}
                          </p>
                        </div>
                        {roles.length > 1 && (
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[#EF4217]/40 shrink-0 group-hover:text-[#EF4217] transition-colors" />
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{roleDisplayName(activeRole.title)}</p>
                  {roles.length > 1 && <p className="text-xs text-muted-foreground">Click to switch role</p>}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {sidebarSections.map((section) => {
            const visibleLinks = section.links.filter((link) =>
              hasPermission(link.permissions || []) && hasRole(link.roles || [])
            )

            if (visibleLinks.length === 0) return null

            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#08184A]/45 dark:text-white/45">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleLinks.map((link) => (
                      <SidebarMenuItem key={link.href || link.label}>
                        {link.subLinks && link.subLinks.length > 0 ? (
                          <Collapsible
                            open={openSubMenus[link.label]}
                            onOpenChange={() => toggleSubMenu(link.label)}
                            className="group/collapsible"
                          >
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={link.label}
                                isActive={isLinkActive(link.href, link.subLinks)}
                                className={cn(
                                  "font-bold text-[#08184A]/70 dark:text-white transition-all duration-200",
                                  "hover:bg-[#08184A]/10 dark:hover:bg-white/10 hover:text-[#08184A] dark:hover:text-white hover:translate-x-1",
                                  "data-[active=true]:bg-[#FF4B12]/10 data-[active=true]:text-[#FF4B12] data-[active=true]:font-bold data-[active=true]:border-l-2 data-[active=true]:border-[#FF4B12]"
                                )}
                              >
                                {link.icon && <link.icon />}
                                <span>{link.label}</span>
                                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {link.subLinks.map((subLink) => (
                                  <Can permissions={subLink.permissions || []} key={subLink.href}>
                                    <SidebarMenuSubItem>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={pathname === subLink.href}
                                        className={cn(
                                          "font-bold text-[#08184A]/70 dark:text-white transition-all duration-200",
                                          "hover:bg-[#08184A]/10 dark:hover:bg-white/10 hover:text-[#08184A] dark:hover:text-white hover:translate-x-1",
                                          "data-[active=true]:bg-[#FF4B12]/10 data-[active=true]:text-[#FF4B12] data-[active=true]:font-bold data-[active=true]:border-l-2 data-[active=true]:border-[#FF4B12]"
                                        )}
                                      >
                                        <Link href={subLink.href || '#'}>{subLink.label}</Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  </Can>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            tooltip={link.label}
                            isActive={pathname === link.href}
                            className={cn(
                              "font-bold text-[#08184A]/70 dark:text-white transition-all duration-200",
                              "hover:bg-[#08184A]/10 dark:hover:bg-white/10 hover:text-[#08184A] dark:hover:text-white hover:translate-x-1",
                              "data-[active=true]:bg-[#FF4B12]/10 data-[active=true]:text-[#FF4B12] data-[active=true]:font-bold data-[active=true]:border-l-2 data-[active=true]:border-[#FF4B12]"
                            )}
                          >
                            <Link href={link.href || '#'}>
                              {link.icon && <link.icon />}
                              <span>{link.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
          
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <Collapsible open={userMenuOpen} onOpenChange={setUserMenuOpen} className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={sub || "User"}>
                    <div className="flex aspect-square size-8 items-center justify-center rounded-full" style={{ backgroundColor: "#FEE2E2" }}>
                      <User className="size-4" style={{ color: "#EF4217" }} />
                    </div>
                    <div className="flex flex-col gap-[1px] leading-tight flex-1 min-w-0">
                      <Link href="/dashboard/user" onClick={(e) => e.stopPropagation()} className="font-semibold truncate hover:underline">
                        {sub || "User"}
                      </Link>
                    </div>
                    <ChevronUp className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180 shrink-0" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {/* Settings */}
                    {settingsLinks.map((settingsLink) => (
                      <Can permissions={settingsLink.permissions || []} key={settingsLink.label}>
                        <SidebarMenuSubItem>
                          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="group/settings">
                            <CollapsibleTrigger asChild>
                              <SidebarMenuSubButton>
                                {settingsLink.icon && <settingsLink.icon />}
                                <span>{settingsLink.label}</span>
                                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/settings:rotate-180" />
                              </SidebarMenuSubButton>
                            </CollapsibleTrigger>
                            {settingsLink.subLinks && (
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4">
                                  {settingsLink.subLinks.map((subLink) => (
                                    <Can permissions={subLink.permissions || []} key={subLink.href}>
                                      <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild isActive={pathname === subLink.href}>
                                          <Link href={subLink.href || '#'}>{subLink.label}</Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    </Can>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </Collapsible>
                        </SidebarMenuSubItem>
                      </Can>
                    ))}

                    {/* ── Check Jobs ───────────────────────────────────────── */}
                    <Can permissions={["create_unit"]}>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton onClick={handleOpenDrawer}>
                          <Briefcase />
                          <span>Check Jobs</span>
                          {pendingJobsCount > 0 && (
                            <Badge className="ml-auto text-white" style={{ backgroundColor: "#EF4217" }}>
                              {pendingJobsCount}
                            </Badge>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </Can>

                    {/* ── Logout ───────────────────────────────────────────── */}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton onClick={() => setShowLogoutDialog(true)}>
                        <Power className="!text-red-600" />
                        <span>Logout</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>

          {open ? (
            <div className="text-xs text-center text-muted-foreground py-2 text-wrap">
              © {new Date().getFullYear()}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={githubUrl} target="_blank" className="cursor-pointer"> SlickHood</Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Commit: {commitHash}</p>
                  <p>Click to view on GitHub</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="text-xs text-center text-muted-foreground py-2">
              © {new Date().getFullYear()}
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* ── Role Switcher Modal ─────────────────────────────────────────────── */}
      <Dialog open={roleSwitcherOpen} onOpenChange={setRoleSwitcherOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserCog className="w-5 h-5" style={{ color: "#EF4217" }} />
              Switch Role
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select the role you want to operate under.
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 py-4 space-y-2">
            {roles.map((role, idx) => {
              const isActive = role.title === activeRole?.title;
              return (
                <button
                  key={role.title}
                  onClick={() => handleRoleSwitch(role)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200",
                    isActive
                      ? "border-[#EF4217] bg-[#EF4217]/5"
                      : "border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 hover:border-[#EF4217]/40 hover:bg-gray-50 dark:hover:bg-white/10"
                  )}
                >
                  <div
                    className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors", isActive ? "text-white" : "bg-gray-100 dark:bg-white/10 text-[#141130] dark:text-white")}
                    style={isActive ? { backgroundColor: "#EF4217" } : undefined}
                  >
                    {getRoleIcon(role.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{roleDisplayName(role.title)}</p>
                    <span className="flex items-center gap-1 mt-0.5">
                      <span className={cn("size-1.5 rounded-full", roleColor(idx))} />
                      <span className="text-xs text-muted-foreground">
                        {isActive ? "Currently active" : "Click to switch"}
                      </span>
                    </span>
                  </div>
                  {isActive && <Check className="size-4 shrink-0" style={{ color: "#EF4217" }} />}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Switching roles reloads your permissions.</p>
            <button
              onClick={() => { setRoleSwitcherOpen(false); router.push("/business-areas?intent=add"); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#EF4217] text-[#EF4217] hover:bg-[#EF4217] hover:text-white"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Business Area
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Logout Dialog ───────────────────────────────────────────────────── */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>You will need to login again to access your account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-red-600">Yes, Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canAccessJobs && (
        <JobsDrawer
          open={isJobsDrawerOpen}
          onOpenChange={setIsJobsDrawerOpen}
          onJobsUpdate={async () => { const c = await fetchPendingJobs(); setupPolling(c > 0); }}
        />
      )}
    </>
  );
}

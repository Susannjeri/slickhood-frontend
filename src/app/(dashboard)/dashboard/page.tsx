'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardTotals } from "@/hooks/useDashboardTotals";
import { DocumentDashboardWidget } from "@/components/documents/DocumentDashboardWidget";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { normalizedRoleTitle, roleDisplayName } from "@/config/businessAreas";
import { generateReport, listReportCatalog, OperationalReport, ReportDefinition } from "@/lib/api";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Home,
  AlertCircle,
  Calendar,
  Activity,
  FileText,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const { totals, loading, error } = useDashboardTotals();
  const activeRole = useAuthStore((state) => state.activeRole);
  const permissions = useAuthStore((state) => state.permissions);
  const activeRoleKey = normalizedRoleTitle(activeRole?.title);
  const workspaceDescription: Record<string, string> = {
    landlord: "Manage properties, units, tenants, leases, collections and landlord obligations.",
    estatemanager: "Manage homeowners, service charges, common areas and estate operations.",
    salesagent: "Manage the complete property sale journey from buyer interest to ownership handover.",
    assetportfoliomanager: "Track assets, performance, cash flow, debt, compliance and net worth.",
  };

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Non-blocking on error/empty — render 0 rather than crash or blank the page.
  const landlordStats = [
    { title: "Total Properties", value: (totals?.totalProperties ?? 0).toLocaleString(), icon: Building2, color: "#EF4217" },
    { title: "Total Units",      value: (totals?.totalUnits ?? 0).toLocaleString(),      icon: Home,      color: "#10B981" },
    { title: "Active Tenants",   value: (totals?.activeTenants ?? 0).toLocaleString(),   icon: Users,     color: "#3B82F6" },
    {
      title: "Monthly Revenue",
      value: `KES ${(totals?.monthlyRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "#8B5CF6",
    },
  ];
  const stats = totals?.role ? [
    { title: totals.primaryLabel ?? "Active", value: (totals.primaryCount ?? 0).toLocaleString(), icon: Building2, color: "#EF4217" },
    { title: totals.secondaryLabel ?? "In progress", value: (totals.secondaryCount ?? 0).toLocaleString(), icon: Home, color: "#10B981" },
    { title: totals.pendingLabel ?? "Pending", value: (totals.pendingActions ?? 0).toLocaleString(), icon: AlertCircle, color: "#3B82F6" },
    { title: totals.completedLabel ?? "Completed", value: (totals.completedCount ?? 0).toLocaleString(), icon: TrendingUp, color: "#8B5CF6" },
  ] : landlordStats;

  const [recentActivity,setRecentActivity]=useState<Array<{id:number;title:string;description:string;time:string;icon:typeof FileText}>>([]);
  const [upcomingTasks,setUpcomingTasks]=useState<Array<{id:number;task:string;due:string}>>([]);
  const [occupancyData,setOccupancyData]=useState<Array<{month:string;rate:number}>>([]);
  const [healthMetrics,setHealthMetrics]=useState<Array<{label:string;value:number;status:string;statusColor:string;barColor:string}>>([]);

  useEffect(()=>{
    let cancelled=false;
    const loadOperational=async()=>{
      try{
        const catalog=((await listReportCatalog()).data?.data??[]) as ReportDefinition[];
        const available=new Set(catalog.map(r=>r.code));const to=new Date();const from=new Date();from.setDate(from.getDate()-90);const iso=(d:Date)=>d.toISOString().slice(0,10);
        const requests:Promise<{code:string;report:OperationalReport}>[]=[];
        for(const code of ["ACCOUNT_STATEMENT","LEASE_EXPIRY","OCCUPANCY_RENT_ROLL","INVOICE_COLLECTIONS"]){if(available.has(code))requests.push(generateReport(code,iso(from),iso(to)).then(r=>({code,report:r.data?.data as OperationalReport})));}
        const reports=await Promise.all(requests);if(cancelled)return;const byCode=Object.fromEntries(reports.map(r=>[r.code,r.report]));
        const account=byCode.ACCOUNT_STATEMENT?.rows??[];setRecentActivity(account.slice(0,6).map((row,index)=>({id:index,title:String(row.Account??"Financial activity"),description:String(row.Description??"Ledger entry"),time:new Date(String(row.Date)).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"}),icon:FileText})));
        const leases=byCode.LEASE_EXPIRY?.rows??[];setUpcomingTasks(leases.slice(0,6).map((row,index)=>({id:index,task:`Lease ${row.Lease} · Unit ${row.Unit}`,due:`Expires ${new Date(String(row.Expiry)).toLocaleDateString("en-KE",{dateStyle:"medium"})}`})));
        const occupancy=Number(byCode.OCCUPANCY_RENT_ROLL?.metrics?.["Occupancy %"]??0);if(byCode.OCCUPANCY_RENT_ROLL)setOccupancyData([{month:"Current",rate:occupancy}]);
        const invoiceRows=byCode.INVOICE_COLLECTIONS?.rows??[];const billed=invoiceRows.reduce((s,r)=>s+Number(r.Amount??0),0);const collected=invoiceRows.reduce((s,r)=>s+Number(r.Collected??0),0);const collection=billed?Math.round(collected*100/billed):100;
        const health=[] as Array<{label:string;value:number;status:string;statusColor:string;barColor:string}>;if(byCode.OCCUPANCY_RENT_ROLL)health.push({label:"Occupancy",value:occupancy,status:`${occupancy}%`,statusColor:occupancy>=80?"text-green-600":"text-amber-600",barColor:occupancy>=80?"bg-green-500":"bg-amber-500"});if(byCode.INVOICE_COLLECTIONS)health.push({label:"Collections",value:collection,status:`${collection}%`,statusColor:collection>=90?"text-green-600":"text-amber-600",barColor:collection>=90?"bg-green-500":"bg-amber-500"});setHealthMetrics(health);
      }catch{/* Role totals remain usable if optional operational reports are unavailable. */}
    };void loadOperational();return()=>{cancelled=true;};
  },[activeRole?.title]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#141130] dark:text-white">{roleDisplayName(activeRole?.title) || "SlickHood"} dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {workspaceDescription[activeRoleKey] ?? "Here’s what needs your attention today."}
          </p>
        </div>
        {permissions.includes("create_property") && <Button asChild className="text-white" style={{ backgroundColor: "#EF4217" }}><Link href="/dashboard/property/create">
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Link></Button>}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow border dark:border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-[#141130] dark:text-white">
                    {stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Occupancy Chart */}
          {occupancyData.length > 0 && <Card className="border dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#141130] dark:text-white">
                <TrendingUp className="w-5 h-5" style={{ color: "#EF4217" }} />
                Occupancy Rate
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Current occupancy across the properties available to this role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {occupancyData.map((data) => (
                  <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative group">
                      <div
                        className="w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${data.rate * 2.5}px`, backgroundColor: "#EF4217" }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#141130] dark:bg-white/10 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm">
                        {data.rate}%
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{data.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>}

          {/* Recent Activity */}
          <Card className="border dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#141130] dark:text-white">
                <Activity className="w-5 h-5" style={{ color: "#EF4217" }} />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Latest updates across your properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {recentActivity.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No recent activity has been recorded for this role.</p>}
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#FEE2E2" }}
                      >
                        <Icon className="w-5 h-5" style={{ color: "#EF4217" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#141130] dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          <DocumentDashboardWidget />

          {/* Quick Actions */}
          <Card className="border dark:border-white/10">
            <CardHeader>
              <CardTitle className="text-[#141130] dark:text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {permissions.includes("create_unit") && <Button asChild variant="outline" className="w-full justify-start dark:border-white/10 dark:text-white dark:hover:bg-white/10"><Link href="/dashboard/unit/create">
                <Home className="w-4 h-4 mr-2" />
                Add New Unit
              </Link></Button>}
              {permissions.includes("view_lease_template") && <Button asChild variant="outline" className="w-full justify-start dark:border-white/10 dark:text-white dark:hover:bg-white/10"><Link href="/dashboard/lease/templates">
                <FileText className="w-4 h-4 mr-2" />
                Create Lease
              </Link></Button>}
              {permissions.includes("view_estate") && <Button asChild variant="outline" className="w-full justify-start"><Link href="/dashboard/estate"><Building2 className="mr-2 h-4 w-4"/>Estate Management</Link></Button>}
              {permissions.includes("view_sale_pipeline") && <Button asChild variant="outline" className="w-full justify-start"><Link href="/dashboard/sales"><TrendingUp className="mr-2 h-4 w-4"/>Property Sale Management</Link></Button>}
              {permissions.includes("view_wealth") && <Button asChild variant="outline" className="w-full justify-start"><Link href="/dashboard/wealth"><TrendingUp className="mr-2 h-4 w-4"/>Open Wealth</Link></Button>}
              {permissions.includes("view_lease_document") && <Button asChild variant="outline" className="w-full justify-start"><Link href="/dashboard/documents"><FileText className="mr-2 h-4 w-4"/>Documents & notices</Link></Button>}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="border dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#141130] dark:text-white">
                <Calendar className="w-5 h-5" style={{ color: "#EF4217" }} />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No due tasks are available yet.</p>}
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 hover:border-[#EF4217] dark:hover:border-[#EF4217] transition-colors cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#EF4217" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#141130] dark:text-white">{task.task}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{task.due}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Property Health */}
          {healthMetrics.length > 0 && <Card className="border dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#141130] dark:text-white">
                <Activity className="w-5 h-5 text-green-500" />
                Property Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</span>
                    <span className={`text-sm font-semibold ${metric.statusColor}`}>{metric.status}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${metric.barColor}`} style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>}
        </div>
      </div>
    </div>
  );
}

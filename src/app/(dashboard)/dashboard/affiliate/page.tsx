"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  affiliateDashboard,
  AffiliateDashboard,
  requestAffiliatePayout,
  setAffiliatePayoutAccount,
} from "@/services/affiliate";
import { listAccounts } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { envelopeItem, envelopePageList } from "@/lib/api-envelope";
import type { Account } from "@/types/account";
const money = (n: number, c = "KES") =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(n || 0);
const date = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "—";
const apiError = (e: any, f: string) => e?.response?.data?.description ?? f;
const window = globalThis.window ?? ({ location: { origin: "" } } as Window);
export default function AffiliatePage() {
  const token = useAuthStore((s) => s.token),
    [data, setData] = useState<AffiliateDashboard>(),
    [accounts, setAccounts] = useState<Account[]>([]),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const [d, a] = await Promise.all([
        affiliateDashboard(),
        listAccounts(token, { byLandlord: true, size: 100 }),
      ]);
      const dashboard = envelopeItem<AffiliateDashboard | undefined>(d, undefined);
      setData(
        dashboard
          ? {
              ...dashboard,
              referrals: Array.isArray(dashboard.referrals) ? dashboard.referrals : [],
              commissions: Array.isArray(dashboard.commissions) ? dashboard.commissions : [],
              payouts: Array.isArray(dashboard.payouts) ? dashboard.payouts : [],
            }
          : undefined,
      );
      setAccounts(envelopePageList<Account>(a));
    } catch (e) {
      toast.error(apiError(e, "Affiliate workspace could not be loaded."));
    } finally {
      setBusy(false);
    }
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);
  const link = useMemo(
    () =>
      data ? `${window.location.origin}/r/${data.profile.referralCode}` : "",
    [data],
  );
  const copy = async (value = link) => {
    await navigator.clipboard.writeText(value);
    toast.success("Referral link copied.");
  };
  const share = async () => {
    if (navigator.share)
      await navigator.share({
        title: "Join SlickHood",
        text: "Join SlickHood through my referral link.",
        url: link,
      });
    else await copy();
  };
  const setAccount = async (id: number) => {
    try {
      await setAffiliatePayoutAccount(id);
      toast.success("Payout account saved.");
      await load();
    } catch (e) {
      toast.error(apiError(e, "Payout account could not be saved."));
    }
  };
  const payout = async () => {
    try {
      await requestAffiliatePayout();
      toast.success("Payout request submitted.");
      await load();
    } catch (e) {
      toast.error(
        apiError(
          e,
          `Available earnings must reach ${money(data?.profile.minimumPayout ?? 0)} and a verified payout account is required.`,
        ),
      );
    }
  };
  if (!data)
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <RefreshCw className={`mr-2 h-5 w-5 ${busy ? "animate-spin" : ""}`} />
        Loading affiliate workspace…
      </div>
    );
  return (
    <div className="space-y-6 px-3 py-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#162B63] to-[#07163A] p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">
              SlickHood Affiliate
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Refer people. Grow SlickHood. Earn.
            </h1>
            <p className="mt-2 max-w-2xl text-white/70">
              Share your unique link with landlords, tenants, service providers
              and other users. Eligible paid subscriptions create commission
              automatically.
            </p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
            {data.profile.status}
          </Badge>
        </div>
        <div className="mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl bg-white/10 p-2 sm:flex-row">
          <div className="min-w-0 flex-1 px-3 py-2 font-mono text-sm">
            {link}
          </div>
            <Button onClick={() => copy()} variant="secondary" className="w-full sm:w-auto">
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
            <Button onClick={share} className="w-full bg-[#FF4B1F] hover:bg-[#E8451D] sm:w-auto">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={Users}
          label="Referrals"
          value={String(data.totalReferrals)}
        />
        <Metric
          icon={CheckCircle2}
          label="Conversions"
          value={String(data.conversions)}
        />
        <Metric
          icon={Wallet}
          label="Available"
          value={money(data.availableBalance)}
        />
        <Metric
          icon={BadgeDollarSign}
          label="Lifetime earnings"
          value={money(data.lifetimeEarnings)}
        />
        <Metric
          icon={RefreshCw}
          label="Pending payouts"
          value={money(data.pendingPayouts)}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Referrals and conversions</CardTitle>
              <CardDescription>
                Registration is attributed once and the first eligible paid
                subscription marks a conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="py-3">User</th>
                    <th>Status</th>
                    <th>Campaign</th>
                    <th>Registered</th>
                    <th>Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-4 font-medium">
                        User #{r.referredUserId}
                      </td>
                      <td>
                        <Status value={r.status} />
                      </td>
                      <td>{r.campaign || "Direct"}</td>
                      <td>{date(r.registeredAt)}</td>
                      <td>{date(r.convertedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.referrals.length && (
                <Empty text="No referrals yet. Share your link to begin." />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Commission ledger</CardTitle>
              <CardDescription>
                Auditable earnings created only from confirmed subscription
                payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.commissions.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div>
                    <b>{c.invoiceRef}</b>
                    <p className="text-sm text-slate-500">
                      {money(c.qualifyingAmount, c.currency)} qualifying value ·{" "}
                      {c.commissionRate}%
                    </p>
                    <p className="text-xs text-slate-400">
                      Earned {date(c.earnedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <b className="text-emerald-700">
                      +{money(c.commissionAmount, c.currency)}
                    </b>
                    <div>
                      <Status value={c.status} />
                    </div>
                  </div>
                </div>
              ))}
              {!data.commissions.length && (
                <Empty text="Commissions will appear after referred users complete an eligible payment." />
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout setup</CardTitle>
              <CardDescription>
                Choose a verified account you own. Minimum payout:{" "}
                {money(data.profile.minimumPayout, data.profile.currency)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={data.profile.payoutAccountId ?? 0}
                onChange={(e) => setAccount(Number(e.target.value))}
                className="w-full rounded-xl border p-3 text-sm"
              >
                <option value={0}>Select verified payout account</option>
                {accounts
                  .filter((a) => a.verified && a.active)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.channel}
                    </option>
                  ))}
              </select>
              <Button
                onClick={payout}
                disabled={
                  busy ||
                  data.availableBalance < data.profile.minimumPayout ||
                  !data.profile.payoutAccountId
                }
                className="w-full bg-[#FF4B1F] hover:bg-[#E8451D]"
              >
                Request payout
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payout history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.payouts.map((p) => (
                <div key={p.id} className="rounded-xl border p-4">
                  <div className="flex justify-between">
                    <b>{p.payoutNumber}</b>
                    <Status value={p.status} />
                  </div>
                  <p className="mt-1 font-semibold">
                    {money(p.amount, p.currency)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Requested {date(p.requestedAt)}
                  </p>
                </div>
              ))}
              {!data.payouts.length && <Empty text="No payout requests yet." />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Campaign links
              </CardTitle>
              <CardDescription>
                Add a campaign name to measure where registrations came from.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => copy(`${link}?campaign=whatsapp`)}
                className="flex w-full items-center justify-between rounded-xl border p-3 text-sm font-semibold"
              >
                Copy WhatsApp campaign link
                <ExternalLink className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-[#FF4B1F]" />
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#162B63]">{value}</p>
      </CardContent>
    </Card>
  );
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      variant="secondary"
      className={
        value === "CONVERTED" || value === "EARNED" || value === "PAID"
          ? "bg-emerald-50 text-emerald-700"
          : value.includes("REQUEST")
            ? "bg-amber-50 text-amber-700"
            : ""
      }
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{text}</p>;
}

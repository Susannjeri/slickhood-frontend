"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Loader2, LockKeyhole, Mail, MessageSquareText, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { apiErrorMessage } from "@/lib/api-error";
import { NotificationCategory, NotificationCategoryPreference, NotificationPreferences, notificationService } from "@/services/notification.service";

const descriptions: Record<NotificationCategory, { label: string; detail: string }> = {
  BILLING: { label: "Billing", detail: "Invoices, payment confirmations, late fees and overdue balances." },
  PROPERTY: { label: "Property", detail: "Invitations, agreements, ownership, tenancy and property activity." },
  MARKETPLACE_DELIVERY: { label: "Marketplace & delivery", detail: "Orders, service bookings, dispatch and delivery progress." },
  SECURITY: { label: "Security", detail: "Account and security activity. OTP codes remain on SMS or email." },
  MARKETING: { label: "Marketing", detail: "Optional SlickHood news, offers and product updates." },
};

export default function SettingsPage() {
  const [value, setValue] = useState<NotificationPreferences>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const response = await notificationService.preferences();
      const preference = response.data?.data?.[0] as NotificationPreferences | undefined;
      if (!response.data?.success || !preference || !Array.isArray(preference.categories))
        throw new Error("The preference response could not be read");
      setValue(preference);
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Could not load notification preferences."));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const change = (category: NotificationCategory, field: "emailEnabled" | "smsEnabled" | "whatsappEnabled", checked: boolean) => {
    setValue(current => current ? { ...current, categories: current.categories.map(item =>
      item.category === category ? { ...item, [field]: checked } : item) } : current);
  };

  const consent = (checked: boolean) => {
    setValue(current => current ? { ...current, whatsappConsented: checked,
      categories: checked ? current.categories : current.categories.map(item => ({ ...item, whatsappEnabled: false })) } : current);
  };

  const save = async () => {
    if (!value || saving) return;
    setSaving(true);
    try {
      const response = await notificationService.updatePreferences({
        whatsappConsent: value.whatsappConsented,
        categories: value.categories.map(({ category, emailEnabled, smsEnabled, whatsappEnabled, version }) =>
          ({ category, emailEnabled, smsEnabled, whatsappEnabled, version })),
      });
      const saved = response.data?.data?.[0] as NotificationPreferences | undefined;
      if (!response.data?.success || !saved) throw new Error(response.data?.description || "Preferences were not saved");
      setValue(saved); toast.success("Notification preferences saved");
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not save notification preferences. Refresh and try again."));
    } finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="flex items-start gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EF4217]"><Bell /></div>
      <div><h1 className="text-3xl font-bold text-[#141130]">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Choose how SlickHood sends non-secret account and business updates.</p></div>
    </header>

    {error ? <Alert variant="destructive"><Bell/><AlertTitle>Preferences could not be loaded</AlertTitle><AlertDescription><p>{error}</p><Button className="mt-2" variant="outline" onClick={() => void load()}>Try again</Button></AlertDescription></Alert> :
      loading || !value ? <div className="flex justify-center rounded-xl border bg-white py-20"><Loader2 className="size-8 animate-spin text-[#EF4217]" /></div> : <>
        <Alert className="border-emerald-200 bg-emerald-50/60"><ShieldCheck/><AlertTitle>Important in-app notifications stay on</AlertTitle><AlertDescription>Security, payment and active-service events always remain available in your notification centre, even if an external channel fails.</AlertDescription></Alert>

        <Card>
          <CardHeader><CardTitle><h2>Notification preferences</h2></CardTitle><CardDescription>Each category is independent. Marketing is optional and off by default.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="hidden grid-cols-[1fr_repeat(4,7rem)] gap-3 px-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span className="text-left">Category</span><span>In app</span><span>Email</span><span>SMS</span><span>WhatsApp</span>
            </div>
            {value.categories.map(item => <PreferenceRow key={item.category} item={item} phoneVerified={value.phoneVerified}
              consented={value.whatsappConsented} onChange={change} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="size-5 text-emerald-600"/><h2>WhatsApp consent</h2></CardTitle><CardDescription>WhatsApp is a separate channel and is never used for OTP unless a dedicated Meta authentication template is approved.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {!value.phoneVerified && <Alert><Phone/><AlertTitle>Verify your phone first</AlertTitle><AlertDescription>Your saved number {value.maskedPhone || "is not verified"}. <Link className="font-semibold text-[#EF4217] underline" href="/dashboard/user">Open Profile</Link> to add or verify it.</AlertDescription></Alert>}
            <label className={`flex items-start gap-3 rounded-xl border p-4 ${!value.phoneVerified ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <Checkbox checked={value.whatsappConsented} disabled={!value.phoneVerified} onCheckedChange={checked => consent(checked === true)} aria-label="Consent to WhatsApp notifications" />
              <span><strong className="block">I agree to receive selected SlickHood notifications on WhatsApp</strong><span className="mt-1 block text-sm text-muted-foreground">You can withdraw consent here at any time. Every change is retained in the security audit history.</span></span>
            </label>
            <p className="text-xs text-muted-foreground">Only approved Meta templates can be enabled. Unavailable switches indicate that the matching category template is not approved or configured yet.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button size="lg" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <CheckCircle2 className="mr-2 size-4"/>}Save preferences</Button></div>
      </>}
  </main>;
}

function PreferenceRow({ item, phoneVerified, consented, onChange }: { item: NotificationCategoryPreference; phoneVerified: boolean; consented: boolean; onChange: (category: NotificationCategory, field: "emailEnabled" | "smsEnabled" | "whatsappEnabled", checked: boolean) => void }) {
  const text = descriptions[item.category];
  const controls = [
    { key: "inapp", label: "In app", icon: <LockKeyhole className="size-4"/>, checked: true, disabled: true },
    { key: "emailEnabled", label: "Email", icon: <Mail className="size-4"/>, checked: item.emailEnabled, disabled: false },
    { key: "smsEnabled", label: "SMS", icon: <Phone className="size-4"/>, checked: item.smsEnabled, disabled: !phoneVerified || !item.smsAvailable },
    { key: "whatsappEnabled", label: "WhatsApp", icon: <MessageSquareText className="size-4"/>, checked: item.whatsappEnabled, disabled: !consented || !item.whatsappAvailable },
  ] as const;
  return <section className="grid gap-4 rounded-xl border p-4 md:grid-cols-[1fr_repeat(4,7rem)] md:items-center">
    <div><h2 className="font-semibold text-[#141130]">{text.label}</h2><p className="mt-1 text-sm text-muted-foreground">{text.detail}</p></div>
    {controls.map(control => <label key={control.key} className="flex items-center justify-between gap-3 md:flex-col md:justify-center">
      <span className="flex items-center gap-2 text-sm md:hidden">{control.icon}{control.label}</span>
      <Switch checked={control.checked} disabled={control.disabled} aria-label={`${control.label} for ${text.label}`}
        onCheckedChange={checked => control.key !== "inapp" && onChange(item.category, control.key, checked)} />
    </label>)}
  </section>;
}

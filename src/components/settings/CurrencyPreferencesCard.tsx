"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Coins, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/api-error";
import { CurrencyPreferences, currencyService } from "@/services/currency.service";

export default function CurrencyPreferencesCard() {
  const [value, setValue] = useState<CurrencyPreferences>();
  const [candidate, setCandidate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const response = await currencyService.preferences();
      const result = response.data?.data?.[0] as CurrencyPreferences | undefined;
      if (!response.data?.success || !result || !Array.isArray(result.availableCurrencies)) throw new Error("The currency response could not be read");
      setValue(result);
      setCandidate(result.availableCurrencies.find(option => !result.enabledCurrencies.includes(option.code))?.code || "");
    } catch (failure: unknown) { setError(apiErrorMessage(failure, "Could not load currency preferences.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const remaining = useMemo(() => value?.availableCurrencies.filter(option => !value.enabledCurrencies.includes(option.code)) || [], [value]);
  const details = useMemo(() => new Map(value?.availableCurrencies.map(option => [option.code, option]) || []), [value]);

  const add = () => {
    if (!value || !candidate || value.enabledCurrencies.length >= 25) return;
    const enabledCurrencies = [...value.enabledCurrencies, candidate];
    setValue({ ...value, enabledCurrencies });
    setCandidate(value.availableCurrencies.find(option => !enabledCurrencies.includes(option.code))?.code || "");
  };
  const remove = (code: string) => setValue(current => !current || current.enabledCurrencies.length === 1 || current.defaultCurrency === code ? current : ({ ...current, enabledCurrencies: current.enabledCurrencies.filter(item => item !== code) }));
  const save = async () => {
    if (!value || saving) return;
    setSaving(true);
    try {
      const response = await currencyService.updatePreferences({ defaultCurrency: value.defaultCurrency, enabledCurrencies: value.enabledCurrencies, version: value.version });
      const saved = response.data?.data?.[0] as CurrencyPreferences | undefined;
      if (!response.data?.success || !saved) throw new Error(response.data?.description || "Currencies were not saved");
      setValue(saved); toast.success("Currency preferences saved");
    } catch (failure: unknown) { toast.error(apiErrorMessage(failure, "Could not save currency preferences. Refresh and try again.")); }
    finally { setSaving(false); }
  };

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="size-5 text-[#EF4217]"/><h2>Currencies</h2></CardTitle><CardDescription>Choose the currencies you use and the default for new records. Existing contracts, invoices and payments keep their original currency.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {error ? <Alert variant="destructive"><Coins/><AlertTitle>Currencies could not be loaded</AlertTitle><AlertDescription><p>{error}</p><Button className="mt-2" variant="outline" onClick={() => void load()}>Try again</Button></AlertDescription></Alert> : loading || !value ? <div className="flex justify-center py-10"><Loader2 className="size-7 animate-spin text-[#EF4217]"/></div> : <>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><label className="space-y-1 text-sm font-medium">Add an enabled currency<select value={candidate} onChange={event => setCandidate(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3" aria-label="Currency to enable">{remaining.length === 0 && <option value="">All available currencies are enabled</option>}{remaining.map(option => <option key={option.code} value={option.code}>{option.code} — {option.name}</option>)}</select></label><Button type="button" className="self-end" variant="outline" disabled={!candidate || value.enabledCurrencies.length >= 25} onClick={add}><Plus className="mr-2 size-4"/>Add</Button></div>
        <div className="space-y-2">{value.enabledCurrencies.map(code => <div key={code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><strong>{code}</strong><span className="ml-2 text-sm text-muted-foreground">{details.get(code)?.name}</span>{value.defaultCurrency === code && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Default</span>}</div><div className="flex gap-2"><Button size="sm" type="button" variant="outline" disabled={value.defaultCurrency === code} onClick={() => setValue({ ...value, defaultCurrency: code })}>Set as default</Button><Button size="icon" type="button" variant="ghost" aria-label={`Remove ${code}`} disabled={value.defaultCurrency === code || value.enabledCurrencies.length === 1} onClick={() => remove(code)}><Trash2 className="size-4 text-red-600"/></Button></div></div>)}</div>
        <Alert><Coins/><AlertTitle>No automatic conversion</AlertTitle><AlertDescription>Amounts remain separated by currency. Payment options appear only when the selected provider supports that currency. M-Pesa and PesaLink remain KES-only.</AlertDescription></Alert>
        <div className="flex justify-end"><Button disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Check className="mr-2 size-4"/>}Save currencies</Button></div>
      </>}
    </CardContent>
  </Card>;
}

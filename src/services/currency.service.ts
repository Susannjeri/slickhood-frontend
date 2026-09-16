import { API } from "@/lib/api";

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  fractionDigits: number;
}

export interface CurrencyPreferences {
  defaultCurrency: string;
  enabledCurrencies: string[];
  availableCurrencies: CurrencyOption[];
  version: number;
}

export const currencyService = {
  preferences: () => API.get("/currency/preferences"),
  updatePreferences: (value: Pick<CurrencyPreferences, "defaultCurrency" | "enabledCurrencies" | "version">) =>
    API.put("/currency/preferences", value),
};

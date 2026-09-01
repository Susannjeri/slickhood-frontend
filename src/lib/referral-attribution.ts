const CODE_KEY = "slickhood_referral_code";
const CAMPAIGN_KEY = "slickhood_referral_campaign";
const CAPTURED_KEY = "slickhood_referral_captured_at";
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_PATTERN = /^SH-[A-Z0-9]{8,20}$/;
const CAMPAIGN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export function saveReferralAttribution(code: string, campaign?: string | null) {
  const normalized = code.trim().toUpperCase();
  if (!CODE_PATTERN.test(normalized)) return false;
  localStorage.setItem(CODE_KEY, normalized);
  localStorage.setItem(CAPTURED_KEY, String(Date.now()));
  if (campaign && CAMPAIGN_PATTERN.test(campaign)) localStorage.setItem(CAMPAIGN_KEY, campaign);
  else localStorage.removeItem(CAMPAIGN_KEY);
  return true;
}

export function readReferralAttribution() {
  const code = localStorage.getItem(CODE_KEY);
  const campaign = localStorage.getItem(CAMPAIGN_KEY);
  const capturedAt = Number(localStorage.getItem(CAPTURED_KEY));
  if (!code || !CODE_PATTERN.test(code) || !Number.isFinite(capturedAt) || Date.now() - capturedAt > ATTRIBUTION_WINDOW_MS) {
    clearReferralAttribution();
    return {};
  }
  return { referralCode: code, referralCampaign: campaign && CAMPAIGN_PATTERN.test(campaign) ? campaign : undefined };
}

export function clearReferralAttribution() {
  localStorage.removeItem(CODE_KEY);
  localStorage.removeItem(CAMPAIGN_KEY);
  localStorage.removeItem(CAPTURED_KEY);
}

export type AccountCategory = "LANDLORD" | "SLICKHOOD" | "MERCHANT" | "COMMUNITY_FUND";

export interface PaymentChannelType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
}

export interface AccountProperty {
  key: string;
  label: string;
  description: string;
  value: string;
  encrypted: boolean;
  displayField: boolean;
}

export interface Account {
  id: number;
  channel: string;
  channelDisplayName?: string;
  name: string;
  category: AccountCategory;
  active: boolean;
  verified: boolean;
  createdAt?: string;
  iconUrl?: string;
  // ⚠️ A confirmed real sample of GET /account/list?propertyId=... (invoice
  // pay-flow task) shows the icon field as `icon`, not `iconUrl`, and the
  // date field as `createdOn`, not `createdAt` — both differ from what this
  // type originally assumed. Added additively rather than renaming, since
  // fixing the rest of the Accounts module's usage is out of scope for that
  // task. Prefer `icon`/`createdOn` when present; fall back to the older
  // field for safety. This likely means icons/created-dates have been
  // silently not rendering elsewhere in the Accounts module — worth a
  // follow-up audit.
  icon?: string;
  createdOn?: string;
  properties?: AccountProperty[];
  // ⚠️ Unconfirmed: the superadmin landlord-oversight listing needs the
  // owning landlord's email, but the field name on the response is not
  // verified yet — treat as possibly absent/renamed until confirmed.
  landlordEmail?: string;
}

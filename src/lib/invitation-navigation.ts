export const safeInvitationReturnTo = (search: string): string | null => {
  const value = new URLSearchParams(search).get("returnTo");
  return value === "/lease/initialize" ? value : null;
};

export const invitationUrl = (path: string, token?: string | null, returnTo?: string | null) => {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (returnTo === "/lease/initialize") params.set("returnTo", returnTo);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

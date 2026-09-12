import { businessAreas, normalizedRoleTitle, PROFILE_DASHBOARD_HREF } from "@/config/businessAreas";
import { getCurrentSubscription } from "@/services/subscription.service";
import type { Role } from "@/store/authStore";
import { getCurrentKyc } from "@/services/kyc.service";

export type OnboardingContinuation = {
  complete: boolean;
  destination: string;
  areaTitle?: string;
  message: string;
};

export async function resolveOnboardingContinuation(
  token: string,
  activeRole: Role | null,
  selectedBusinessAreaId?: string | null,
): Promise<OnboardingContinuation> {
  if (!activeRole) {
    return {
      complete: false,
      destination: "/business-areas",
      message: "Choose your role or business area to finish setting up your account.",
    };
  }

  const normalizedRole = normalizedRoleTitle(activeRole.title);
  const internalRoles = ["superadmin", "support", "salesmarketing", "finance", "insuranceadviser", "insurancemanager", "guard", "propertymanager"];
  if (normalizedRole === "superadmin") {
    return { complete: true, destination: PROFILE_DASHBOARD_HREF, message: "Your workspace is ready." };
  }
  if (normalizedRole === "insuranceadviser" || normalizedRole === "insurancemanager") {
    return {
      complete: true,
      destination: PROFILE_DASHBOARD_HREF,
      areaTitle: "Insurance Operations",
      message: "Your Insurance Operations workspace is ready.",
    };
  }
  if (internalRoles.includes(normalizedRole)) {
    return { complete: true, destination: PROFILE_DASHBOARD_HREF, message: "Your assigned staff workspace is ready." };
  }

  const kyc = await getCurrentKyc();
  if (kyc.status !== "APPROVED" || kyc.accountStatus !== "ACTIVE") {
    return {
      complete: false,
      destination: "/kyc",
      message: kyc.status === "SUBMITTED" || kyc.status === "REVIEW_REQUIRED"
        ? "Your identity verification is being reviewed."
        : "Complete identity verification before choosing a plan or entering your workspace.",
    };
  }

  if (normalizedRole === "homeowner") {
    return {
      complete: true,
      destination: PROFILE_DASHBOARD_HREF,
      areaTitle: "My Home",
      message: "Your homeowner workspace is ready. Review your assigned home and estate agreement.",
    };
  }
  if (normalizedRole === "buyer") {
    return {
      complete: true,
      destination: PROFILE_DASHBOARD_HREF,
      areaTitle: "My Property Purchase",
      message: "Your buyer workspace is ready. Review the invited property and its Letter of Offer.",
    };
  }

  const selectedArea = selectedBusinessAreaId
    ? businessAreas.find(item => item.id === selectedBusinessAreaId && item.roleTitles.includes(normalizedRole))
    : undefined;
  const area = selectedArea ?? businessAreas.find(item => item.roleTitles.includes(normalizedRole));
  if (!area) {
    return { complete: true, destination: PROFILE_DASHBOARD_HREF, message: "Your assigned workspace is ready." };
  }

  const response = await getCurrentSubscription(token, area.subscriptionRole);
  const current = response.data.data?.[0] ?? null;
  if (!current) {
    return {
      complete: false,
      destination: `/business-areas/plans?area=${area.id}`,
      areaTitle: area.title,
      message: `Your email is verified. Complete your ${area.title} plan and free-trial setup to enter your workspace.`,
    };
  }

  return {
    complete: true,
    destination: PROFILE_DASHBOARD_HREF,
    areaTitle: area.title,
    message: `Your ${area.title} workspace is ready.`,
  };
}

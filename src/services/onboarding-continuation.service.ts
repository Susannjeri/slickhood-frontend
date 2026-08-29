import { businessAreas, normalizedRoleTitle } from "@/config/businessAreas";
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
): Promise<OnboardingContinuation> {
  if (!activeRole) {
    return {
      complete: false,
      destination: "/business-areas",
      message: "Choose your role or business area to finish setting up your account.",
    };
  }

  const normalizedRole = normalizedRoleTitle(activeRole.title);
  const internalRoles = ["superadmin", "finance", "insuranceadviser", "insurancemanager", "guard", "propertymanager"];
  if (normalizedRole === "superadmin") {
    return { complete: true, destination: "/dashboard", message: "Your workspace is ready." };
  }
  if (normalizedRole === "insuranceadviser" || normalizedRole === "insurancemanager") {
    return {
      complete: true,
      destination: "/dashboard/insurance",
      areaTitle: "Insurance Operations",
      message: "Your Insurance Operations workspace is ready.",
    };
  }
  if (internalRoles.includes(normalizedRole)) {
    return { complete: true, destination: "/dashboard", message: "Your assigned staff workspace is ready." };
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

  const area = businessAreas.find(item => item.roleTitles.includes(normalizedRole));
  if (!area) {
    return { complete: true, destination: "/dashboard", message: "Your assigned workspace is ready." };
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
    destination: area.workspaceHref,
    areaTitle: area.title,
    message: `Your ${area.title} workspace is ready.`,
  };
}

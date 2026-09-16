import RegisterForm from "@/components/auth/RegisterForm";
import { safeInvitationReturnTo } from "@/lib/invitation-navigation";

type RegisterPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
    const params = await searchParams;
    const tokenValue = Array.isArray(params.token) ? params.token[0] : params.token;
    const returnToValue = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
    const safeSearch = new URLSearchParams();
    if (returnToValue) safeSearch.set("returnTo", returnToValue);

    return (
        <div className="">
            <RegisterForm
                initialInviteToken={tokenValue?.trim() || null}
                initialReturnTo={safeInvitationReturnTo(safeSearch.toString())}
            />
        </div>
    );
}

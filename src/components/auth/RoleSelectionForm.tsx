
'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { FaBuilding, FaTools, FaChartPie, FaInfinity, FaUserTie } from 'react-icons/fa';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { roleDisplayName } from '@/config/businessAreas';

interface Role {
    roleId: number;
    roleName: string;
    roleDescription: string;
    selfAssignable: boolean;
    recommended?: boolean;
}

const getRoleIcon = (roleName: string) => {
    const cls = 'w-5 h-5';
    switch (roleName.toLowerCase()) {
        case 'landlord':              return <FaBuilding className={cls} />;
        case 'serviceprovider':       return <FaTools className={cls} />;
        case 'assetportfoliomanager': return <FaChartPie className={cls} />;
        case 'affiliate':             return <FaInfinity className={cls} />;
        default:                      return <FaUserTie className={cls} />;
    }
};

const STEPS = [
    { id: 1, label: 'Choose Role' },
    { id: 2, label: 'Create Account' },
    { id: 3, label: 'Verify Email' },
    { id: 4, label: 'Phone' },
    { id: 5, label: 'Profile' },
];

const RegistrationStepper: React.FC<{ currentStep?: number }> = ({ currentStep = 1 }) => (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm px-3 sm:px-6 py-3 overflow-x-auto transition-colors">
        <div className="flex items-start min-w-[480px]">
            {STEPS.map((step, i) => {
                const done   = step.id < currentStep;
                const active = step.id === currentStep;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors
                                ${active || done
                                    ? 'bg-[#EF4217] border-[#EF4217] text-white'
                                    : 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-400 dark:text-gray-500'}
                            `}>
                                {done ? <Check className="w-3.5 h-3.5" /> : step.id}
                            </div>
                            <span className={`text-[10px] font-medium whitespace-nowrap
                                ${active ? 'text-[#EF4217]' : 'text-gray-400 dark:text-gray-500'}
                            `}>
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className="flex-1 h-px mx-2 mt-3.5 bg-gray-200 dark:bg-white/10" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    </div>
);

const HelpPanel: React.FC<{ roles: Role[] }> = ({ roles }) => (
    <div className="rounded-2xl bg-[#141130] dark:bg-[#0D0B1F] border border-transparent dark:border-white/10 text-white p-4 flex flex-col gap-3 h-full transition-colors">
        <div>
            <h3 className="text-sm font-bold">Need help choosing?</h3>
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                Choose the role closest to your main activity.
            </p>
        </div>

        {roles.length > 0 && (
            <>
                <div className="h-px bg-white/10" />
                <div className="space-y-1.5">
                    {roles.map((r) => (
                        <div key={r.roleId} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-white truncate min-w-0">
                                {roleDisplayName(r.roleName)}
                            </span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-white/50 truncate min-w-0 max-w-[55%] text-right cursor-default">
                                        {r.roleDescription}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-center leading-snug">
                                    {r.roleDescription}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            </>
        )}

        <div className="h-px bg-white/10" />

        <div>
            <p className="text-xs font-semibold text-white mb-1.5">Good to know</p>
            <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-[#EF4217] shrink-0" />
                    Add more roles later
                </p>
                <p className="flex items-center gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-[#EF4217] shrink-0" />
                    One account, many roles
                </p>
            </div>
        </div>
    </div>
);

const RoleSelectionForm: React.FC = () => {
    const router = useRouter();
    const { roles: fetchRoles } = useAuth();
    const { setStep, setRole, resetRegistrationData, inviteToken } = useAuthStore();
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    useLayoutEffect(() => { resetRegistrationData(); }, []);

    useEffect(() => {
        const getRoles = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchRoles();
                const selfAssignableRoles = data.data.filter((role: Role) => role.selfAssignable);
                setAvailableRoles(selfAssignableRoles);
            } catch (err) {
                console.error(err);
                setError('Failed to load roles. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        getRoles();
    }, []);

    const handleSelectRole = (role: Role) => {
        setSelectedRoleId(role.roleId);
        setRole(role.roleId);
    };

    const handleContinue = () => {
        if (selectedRoleId !== null) {
            setStep("account");
            router.push('/register');
        }
    };

    const handlePrevious = () => {
        router.push('/');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-[#EF4217]" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Loading roles...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                    <p className="text-sm font-medium text-red-500">{error}</p>
                    <button onClick={() => window.location.reload()}
                        className="text-sm px-4 py-2 bg-[#EF4217] text-white rounded-lg hover:bg-[#d63600] transition-colors">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">

            {/* Centered header */}
            <div className="text-center space-y-1">
                <p className="text-xs font-bold tracking-wider text-[#EF4217] uppercase">Account Setup</p>
                <h1 className="text-xl sm:text-2xl font-bold text-[#14235C] dark:text-white">
                    {inviteToken ? "Select your role" : "Choose your SlickHood role"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select the profile that best describes how you will use the platform.
                </p>
            </div>

            {/* Stepper */}
            <RegistrationStepper currentStep={1} />

            {/* Section heading */}
            <div className="space-y-0.5">
                <h2 className="text-base font-bold text-[#14235C] dark:text-white">What best describes you?</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your dashboard and onboarding steps will be tailored to this role.
                </p>
            </div>

            {/* Roles grid + help panel (desktop side-by-side) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Role cards (2×2) */}
                <div className="lg:col-span-2">
                    {availableRoles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 h-full">
                            {availableRoles.map((role) => {
                                const selected = selectedRoleId === role.roleId;
                                return (
                                    <button
                                        key={role.roleId}
                                        onClick={() => handleSelectRole(role)}
                                        className={`
                                            relative p-3 pr-10 rounded-xl border text-left transition-all duration-150
                                            ${selected
                                                ? 'border-[#EF4217] bg-[#FFF7F3] dark:bg-[#EF4217]/10'
                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/25'}
                                        `}
                                    >
                                        {/* Radio top-right */}
                                        <div className={`
                                            absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                            ${selected
                                                ? 'border-[#EF4217] bg-[#EF4217]'
                                                : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5'}
                                        `}>
                                            {selected && <Check className="w-3 h-3 text-white" />}
                                        </div>

                                        {/* Icon + name */}
                                        <div className="flex items-center gap-2.5">
                                            <div className={`
                                                w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                                ${selected
                                                    ? 'bg-[#F4DCC7] text-[#EF4217]'
                                                    : 'bg-gray-100 dark:bg-white/10 text-[#141130] dark:text-white'}
                                            `}>
                                                {getRoleIcon(role.roleName)}
                                            </div>
                                            <p className="text-sm font-bold text-[#14235C] dark:text-white leading-tight">
                                                {roleDisplayName(role.roleName)}
                                            </p>
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-1.5 line-clamp-2">
                                            {role.roleDescription}
                                        </p>

                                        {/* Recommended badge */}
                                        {role.recommended && (
                                            <p className="text-[11px] font-semibold text-[#EF4217] mt-1.5">
                                                Recommended
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full py-10 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                            <p className="text-sm text-gray-400 dark:text-gray-500">No roles available</p>
                        </div>
                    )}
                </div>

                {/* Help panel — desktop sidebar only */}
                <div className="hidden lg:block lg:col-span-1">
                    <HelpPanel roles={availableRoles} />
                </div>
            </div>

            {/* Mobile "Need help choosing?" accordion */}
            <div className="lg:hidden">
                <button
                    type="button"
                    onClick={() => setShowHelp((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#141130] dark:bg-[#0D0B1F] text-white text-sm font-bold transition-colors"
                >
                    <span>Need help choosing?</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showHelp ? 'rotate-180' : ''}`} />
                </button>
                {showHelp && (
                    <div className="mt-2">
                        <HelpPanel roles={availableRoles} />
                    </div>
                )}
            </div>

            {/* Bottom row: helper text + buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 order-2 sm:order-1 text-center sm:text-left">
                    Your SlickHood workspace will be customised after this step.
                </p>
                <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                    <button
                        onClick={handlePrevious}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                    >
                        Previous
                    </button>
                    <button
                        onClick={handleContinue}
                        disabled={selectedRoleId === null}
                        className="flex-1 sm:flex-none px-8 py-2.5 bg-[#EF4217] hover:bg-[#d63600] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelectionForm;

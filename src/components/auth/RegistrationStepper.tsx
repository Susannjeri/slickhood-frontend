
'use client';

import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Business Area' },
    { id: 2, label: 'Account' },
    { id: 3, label: 'Email' },
    { id: 4, label: 'Identity' },
    { id: 5, label: 'Plan' },
];

export const RegistrationStepper: React.FC<{ currentStep?: number }> = ({ currentStep = 1 }) => (
    <div>
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 px-3 sm:px-8 py-3 sm:py-4 transition-colors">
            <div className="flex items-start">
                {STEPS.map((step, i) => {
                    const done   = step.id < currentStep;
                    const active = step.id === currentStep;
                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <div className={`
                                    w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors
                                    ${done
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : active
                                            ? 'bg-[#EF4217] border-[#EF4217] text-white'
                                            : 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-400 dark:text-gray-500'}
                                `}>
                                    {done ? <Check className="w-4 h-4" /> : step.id}
                                </div>
                                <span className={`hidden sm:block text-[11px] font-medium whitespace-nowrap
                                    ${done ? 'text-green-500' : active ? 'text-[#EF4217]' : 'text-gray-400 dark:text-gray-500'}
                                `}>
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-px mx-1.5 sm:mx-2 mt-3.5 sm:mt-4
                                    ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-white/10'}`}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
        <p className="sm:hidden text-center text-[11px] font-medium text-[#EF4217] mt-2">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].label}
        </p>
    </div>
);

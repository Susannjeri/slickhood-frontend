import { Suspense } from 'react';
import OnboardClient from './OnboardClient';

export default function OnboardPage() {
  return (
    <Suspense fallback={null}>
      <OnboardClient />
    </Suspense>
  );
}

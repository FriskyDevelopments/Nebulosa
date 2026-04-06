#!/bin/bash
# Only add import if not already present
if ! rg -qF 'import { OnboardingModal }' client/src/pages/dashboard.tsx; then
  sed -i '/import { Link } from "wouter";/a import { OnboardingModal } from "@/components/OnboardingModal";' client/src/pages/dashboard.tsx
fi

# Only add JSX component if not already present
if ! rg -qF '<OnboardingModal />' client/src/pages/dashboard.tsx; then
  sed -i '/<div className="min-h-screen bg-background text-foreground">/a \      <OnboardingModal />' client/src/pages/dashboard.tsx
fi
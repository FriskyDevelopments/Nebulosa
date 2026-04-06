#!/bin/bash
sed -i '/import { Link } from "wouter";/a import { OnboardingModal } from "@/components/OnboardingModal";' client/src/pages/dashboard.tsx
sed -i '/<div className="min-h-screen bg-background text-foreground">/a \      <OnboardingModal />' client/src/pages/dashboard.tsx

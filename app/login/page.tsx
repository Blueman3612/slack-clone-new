'use client';

import { SignInButton } from "@/components/auth/SignInButton";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/chat';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
        <SignInButton callbackUrl={callbackUrl} />
      </div>
    </div>
  );
} 
"use client";

import { SessionProvider as NextSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextSessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
            {children}
        </NextSessionProvider>
    );
}

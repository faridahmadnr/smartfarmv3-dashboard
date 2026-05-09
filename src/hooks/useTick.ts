import { useEffect, useState } from "react";

/**
 * Forces a component re-render on a fixed interval so that
 * time-relative text ("X menit lalu") stays up to date.
 */
export function useTick(intervalMs = 60_000) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
}

import { useEffect, useState } from "react";

export function useTick(intervalMs = 60_000): number {
    const [now, setNow] = useState(0);

    useEffect(() => {
        const tick = () => setNow(Date.now());
        const timeout = setTimeout(tick, 0);
        const id = setInterval(tick, intervalMs);
        return () => {
            clearTimeout(timeout);
            clearInterval(id);
        };
    }, [intervalMs]);

    return now;
}

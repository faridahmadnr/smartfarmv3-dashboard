"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getNotificationWsUrl } from "@/lib/api";

export interface LiveSensorReading {
    id: string;
    kandang_id: string;
    timestamp: string;
    hari_ke: number;
    suhu: number;
    kelembaban: number;
    amoniak: number;
    pakan: number | null;
    minum: number | null;
    populasi: number | null;
    bobot: number | null;
    death: number | null;
    auto_prediction?: {
        classification?: {
            prediction: string;
            confidence: number;
            is_abnormal: boolean;
        };
        forecasting?: {
            predicted_death: number;
            has_risk: boolean;
        };
    };
}

/**
 * Hook that connects to the WebSocket and provides live sensor data pushed from the backend.
 * 
 * When the backend POSTs new sensor data, it broadcasts via WebSocket.
 * This hook receives those events and prepends them to the data array.
 * 
 * Handles auth failures gracefully — won't reconnect if token is invalid/expired.
 */
export function useLiveSensorData(onNewData?: (data: LiveSensorReading) => void) {
    const { data: session, status } = useSession();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const authFailedRef = useRef(false);
    const onNewDataRef = useRef(onNewData);
    onNewDataRef.current = onNewData;

    const [connected, setConnected] = useState(false);
    const [liveReadings, setLiveReadings] = useState<LiveSensorReading[]>([]);
    const [lastReceived, setLastReceived] = useState<Date | null>(null);

    const connect = useCallback(() => {
        if (!session?.accessToken || status !== "authenticated") return;

        // Don't retry if auth already failed
        if (authFailedRef.current) return;

        // Don't reconnect if already open
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        try {
            const url = getNotificationWsUrl(session.accessToken);
            const ws = new WebSocket(url);

            ws.onopen = () => {
                setConnected(true);
                console.log("🔗 Live data WebSocket connected");
            };

            ws.onmessage = (event) => {
                try {
                    if (event.data === "pong") return;
                    const message = JSON.parse(event.data);

                    if (message.type === "sensor_data" && message.data) {
                        const reading = message.data as LiveSensorReading;
                        setLiveReadings(prev => [reading, ...prev]);
                        setLastReceived(new Date());
                        onNewDataRef.current?.(reading);
                    }
                } catch {
                    // Non-JSON messages are fine
                }
            };

            ws.onclose = (event) => {
                setConnected(false);

                // Don't reconnect on auth failures (code 4001)
                if (event.code === 4001) {
                    console.log("🔒 WebSocket auth failed, not reconnecting");
                    authFailedRef.current = true;
                    return;
                }

                // Reconnect after 5 seconds for other disconnects
                if (event.code !== 1000) {
                    reconnectTimerRef.current = setTimeout(connect, 5000);
                }
            };

            ws.onerror = () => {
                // onerror is always followed by onclose, so just let onclose handle it
            };

            wsRef.current = ws;
        } catch {
            // WebSocket constructor can throw if URL is invalid
        }
    }, [session?.accessToken, status]);

    // Reset auth failure flag when token changes (e.g. after re-login)
    useEffect(() => {
        authFailedRef.current = false;
    }, [session?.accessToken]);

    // Setup ping keep-alive
    useEffect(() => {
        const pingInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 30000);

        return () => clearInterval(pingInterval);
    }, []);

    // Connect on mount / when connect changes
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent reconnect on intentional close
                wsRef.current.close();
            }
        };
    }, [connect]);

    const clearLiveReadings = useCallback(() => {
        setLiveReadings([]);
    }, []);

    return { connected, liveReadings, lastReceived, clearLiveReadings };
}

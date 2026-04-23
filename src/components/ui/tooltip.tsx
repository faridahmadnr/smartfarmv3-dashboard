"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    /** "top" | "bottom" | "left" | "right" — default "top" */
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const show = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const scroll = { x: window.scrollX, y: window.scrollY };

        let top = 0, left = 0;
        if (side === "top") {
            top = rect.top + scroll.y - 8;
            left = rect.left + scroll.x + rect.width / 2;
        } else if (side === "bottom") {
            top = rect.bottom + scroll.y + 8;
            left = rect.left + scroll.x + rect.width / 2;
        } else if (side === "left") {
            top = rect.top + scroll.y + rect.height / 2;
            left = rect.left + scroll.x - 8;
        } else {
            top = rect.top + scroll.y + rect.height / 2;
            left = rect.right + scroll.x + 8;
        }
        setPos({ top, left });
        setVisible(true);
    };

    const hide = () => setVisible(false);

    // Adjust position after render so tooltip doesn't clip viewport
    useEffect(() => {
        if (!visible || !tooltipRef.current) return;
        const tip = tooltipRef.current;
        const rect = tip.getBoundingClientRect();
        const vw = window.innerWidth;

        if (rect.right > vw - 8) {
            setPos(p => ({ ...p, left: p.left - (rect.right - vw + 8) }));
        }
        if (rect.left < 8) {
            setPos(p => ({ ...p, left: p.left + (8 - rect.left) }));
        }
    }, [visible]);

    const transformMap: Record<string, string> = {
        top: "translate(-50%, -100%)",
        bottom: "translate(-50%, 0%)",
        left: "translate(-100%, -50%)",
        right: "translate(0%, -50%)",
    };

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                className={className}
            >
                {children}
            </span>
            {visible && typeof document !== "undefined" && createPortal(
                <div
                    ref={tooltipRef}
                    role="tooltip"
                    style={{
                        position: "absolute",
                        top: pos.top,
                        left: pos.left,
                        transform: transformMap[side],
                        zIndex: 9999,
                    }}
                    className="pointer-events-none"
                >
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[260px] leading-relaxed whitespace-pre-wrap">
                        {content}
                    </div>
                    {/* Arrow */}
                    {side === "top" && (
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 mx-auto" />
                    )}
                    {side === "bottom" && (
                        <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900 mx-auto order-first" />
                    )}
                </div>,
                document.body
            )}
        </>
    );
}

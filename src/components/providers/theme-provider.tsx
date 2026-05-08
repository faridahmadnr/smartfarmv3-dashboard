"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "green" | "blue" | "dark";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "green",
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("green");

    useEffect(() => {
        const saved = localStorage.getItem("sf-theme") as Theme | null;
        if (saved && ["green", "blue", "dark"].includes(saved)) {
            setThemeState(saved);
            document.documentElement.setAttribute("data-theme", saved);
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("sf-theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

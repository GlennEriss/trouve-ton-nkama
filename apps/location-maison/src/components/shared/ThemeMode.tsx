'use client'
import React from "react";

export const ThemeMode: React.FC = () => {
    const [theme, setTheme] = React.useState("light");
    React.useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);
    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };
    return (
        <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full border-black dark:border-white flex items-center justify-center bg-black dark:bg-white text-white dark:text-black"
        >
            {theme === "light" ? "🌞" : "🌙"}
        </button>
    )
}
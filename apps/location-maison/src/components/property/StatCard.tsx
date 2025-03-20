import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { TypeProperty } from "@/models/annonce";

const typeColors: Record<string, { bg: string; iconBg: string; iconColor: string; textColor: string }> = {
    Home: {
        bg: "bg-green-100",
        iconBg: "bg-green-200",
        iconColor: "text-green-600",
        textColor: "text-green-800",
    },
    Apartment: {
        bg: "bg-blue-100",
        iconBg: "bg-blue-200",
        iconColor: "text-blue-600",
        textColor: "text-blue-800",
    },
    Studio: {
        bg: "bg-yellow-100",
        iconBg: "bg-yellow-200",
        iconColor: "text-yellow-600",
        textColor: "text-yellow-800",
    },
    Desk: {
        bg: "bg-purple-100",
        iconBg: "bg-purple-200",
        iconColor: "text-purple-600",
        textColor: "text-purple-800",
    },
    Building: {
        bg: "bg-indigo-100",
        iconBg: "bg-indigo-200",
        iconColor: "text-indigo-600",
        textColor: "text-indigo-800",
    },
    Shop: {
        bg: "bg-orange-100",
        iconBg: "bg-orange-200",
        iconColor: "text-orange-600",
        textColor: "text-orange-800",
    },
    Kiosk: {
        bg: "bg-red-100",
        iconBg: "bg-red-200",
        iconColor: "text-red-600",
        textColor: "text-red-800",
    },
    Room: {
        bg: "bg-cyan-100",
        iconBg: "bg-cyan-200",
        iconColor: "text-cyan-600",
        textColor: "text-cyan-800",
    },
    Property: {
        bg: "bg-teal-100",
        iconBg: "bg-teal-200",
        iconColor: "text-teal-600",
        textColor: "text-teal-800",
    }
};

type StatCardProps = {
    icon: LucideIcon;
    title: string;
    value: number | string;
    type: TypeProperty;
    className?: string;
};

export const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    title,
    value,
    type,
    className,
}) => {
    const colors = typeColors[type] || typeColors.Home;

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105",
                colors.bg,
                className
            )}
        >
            <div className={cn("flex items-center justify-center rounded-full p-3", colors.iconBg)}>
                <Icon className={cn(colors.iconColor)} size={32} />
            </div>
            <h3 className="text-gray-800 dark:text-white text-lg font-semibold mt-3">{title}</h3>
            <p className={cn("text-3xl font-bold mt-1", colors.textColor)}>{value}</p>
        </div>
    );
};
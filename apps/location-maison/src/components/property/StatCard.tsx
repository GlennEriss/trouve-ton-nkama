import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { TypeProperty } from "@/models/annonce";

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
    // Couleurs dynamiques pour chaque type de logement
    const typeColors: Record<
        TypeProperty,
        {
            bg: string;
            iconBg: string;
            iconColor: string;
            textColor: string;
            circleBgDark: string;
            circleBgLight: string;
        }
    > = {
        Home: {
            bg: "bg-green-100",
            iconBg: "bg-green-200",
            iconColor: "text-green-600",
            textColor: "text-green-800",
            circleBgDark: "bg-green-300",
            circleBgLight: "bg-green-400",
        },
        Apartment: {
            bg: "bg-blue-100",
            iconBg: "bg-blue-200",
            iconColor: "text-blue-600",
            textColor: "text-blue-800",
            circleBgDark: "bg-blue-300",
            circleBgLight: "bg-blue-400",
        },
        Studio: {
            bg: "bg-yellow-100",
            iconBg: "bg-yellow-200",
            iconColor: "text-yellow-600",
            textColor: "text-yellow-800",
            circleBgDark: "bg-yellow-300",
            circleBgLight: "bg-yellow-400",
        },
        Desk: {
            bg: "bg-purple-100",
            iconBg: "bg-purple-200",
            iconColor: "text-purple-600",
            textColor: "text-purple-800",
            circleBgDark: "bg-purple-300",
            circleBgLight: "bg-purple-400",
        },
        Building: {
            bg: "bg-indigo-100",
            iconBg: "bg-indigo-200",
            iconColor: "text-indigo-600",
            textColor: "text-indigo-800",
            circleBgDark: "bg-indigo-300",
            circleBgLight: "bg-indigo-400",
        },
        Villa: {
            bg: "bg-pink-100",
            iconBg: "bg-pink-200",
            iconColor: "text-pink-600",
            textColor: "text-pink-800",
            circleBgDark: "bg-pink-300",
            circleBgLight: "bg-pink-400",
        },
        Property: {
            bg: "bg-teal-100",
            iconBg: "bg-teal-200",
            iconColor: "text-teal-600",
            textColor: "text-teal-800",
            circleBgDark: "bg-teal-300",
            circleBgLight: "bg-teal-400",
        },
        Logement: {
            bg: "bg-gray-100",
            iconBg: "bg-gray-200",
            iconColor: "text-gray-600",
            textColor: "text-gray-800",
            circleBgDark: "bg-gray-300",
            circleBgLight: "bg-gray-400",
        },
    };

    // Fallback pour les types non définis
    const colors = typeColors[type] || typeColors.Home;

    return (
        <div
            className={cn(
                "relative flex flex-col items-start rounded-lg p-4 shadow-md w-full overflow-hidden",
                colors.bg,
                className
            )}
        >
            {/* Cercles décoratifs */}
            <div
                className={cn(
                    "absolute top-0 right-0 w-32 h-32 rounded-full translate-x-1/4 -translate-y-1/4",
                    colors.circleBgDark
                )}
            ></div>
            <div
                className={cn(
                    "absolute top-0 right-0 w-20 h-20 rounded-full translate-x-1/3 -translate-y-1/3",
                    colors.circleBgLight
                )}
            ></div>

            <div
                className={cn(
                    "flex items-center justify-center rounded-full p-2 mb-4",
                    colors.iconBg
                )}
            >
                <Icon className={cn(colors.iconColor)} size={24} />
            </div>
            <h3 className="text-gray-600 text-sm z-10">{title}</h3>
            <p className={cn("text-2xl font-bold", colors.textColor)}>{value}</p>
        </div>
    );
};
import { Home, Warehouse, Building, Building2, Briefcase, Bed, Store, ShoppingBag, Landmark } from "lucide-react";

export const propertyTypesList = [
    { type: "Home", icon: <Home className="w-10 h-10 text-blue-500" /> },
    {
      type: "Studio",
      icon: <Warehouse className="w-10 h-10 text-yellow-500" />,
    },
    { type: "Apartment", icon: <Building className="w-10 h-10 text-red-500" /> },
    { type: "Building", icon: <Building2 className="w-10 h-10 text-orange-500" /> },
    {
      type: "Desk",
      icon: <Briefcase className="w-10 h-10 text-purple-500" />,
    },
    {
      type: "Room",
      icon: <Bed className="w-10 h-10 text-teal-500" />,
    },
    {
      type: "Kiosk",
      icon: <Store className="w-10 h-10 text-teal-500" />,
    },
    {
      type: "Shop",
      icon: <ShoppingBag className="w-10 h-10 text-teal-500" />,
    },
    {
      type: "Land",
      icon: <Landmark className="w-10 h-10 text-green-500" />,
    },
  ];
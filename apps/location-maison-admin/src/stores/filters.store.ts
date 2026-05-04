import { create } from "zustand";

type DateRange = "7d" | "30d" | "custom";

type FiltersState = {
  analyticsRange: DateRange;
  setAnalyticsRange: (value: DateRange) => void;
};

export const useFiltersStore = create<FiltersState>((set) => ({
  analyticsRange: "7d",
  setAnalyticsRange: (value) => set({ analyticsRange: value }),
}));

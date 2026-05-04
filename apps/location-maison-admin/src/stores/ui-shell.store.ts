import { create } from "zustand";

type UiShellState = {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
};

export const useUiShellStore = create<UiShellState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

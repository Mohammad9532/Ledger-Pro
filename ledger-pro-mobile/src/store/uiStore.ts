import { create } from 'zustand';

interface UiState {
  activeDirectoryTab: 'accounts' | 'contacts';
  setActiveDirectoryTab: (tab: 'accounts' | 'contacts') => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeDirectoryTab: 'accounts',
  setActiveDirectoryTab: (tab) => set({ activeDirectoryTab: tab }),
}));

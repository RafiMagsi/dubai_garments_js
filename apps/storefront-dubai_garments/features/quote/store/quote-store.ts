import { create } from 'zustand';

interface QuoteStoreState {
  selectedProductId: string | null;
  selectedProductName: string | null;
  setSelectedProduct: (id: string, name: string) => void;
  clearSelectedProduct: () => void;
}

export const useQuoteStore = create<QuoteStoreState>((set) => ({
  selectedProductId: null,
  selectedProductName: null,
  setSelectedProduct: (id, name) =>
    set({
      selectedProductId: id,
      selectedProductName: name,
    }),
  clearSelectedProduct: () =>
    set({
      selectedProductId: null,
      selectedProductName: null,
    }),
}));

export interface UseYearFilterResult {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  availableYears: string[];
  isLoading: boolean;
}

export declare function useYearFilter(clubId: string | undefined): UseYearFilterResult;

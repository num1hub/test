import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { CapsuleSubtype, CapsuleTier, CapsuleType, SovereignCapsule } from '@/types/capsule';
import { sortCapsules, type SortOption } from '@/utils/sortUtils';
import type { VaultViewMode } from '@/components/vault/VaultControls';

type ProcessVaultDashboardCapsulesArgs = {
  activeTypes: Set<CapsuleType>;
  activeTiers: Set<CapsuleTier>;
  activeSubtypes: Set<CapsuleSubtype>;
  searchQuery?: string;
  sortOption: SortOption;
};

export function processVaultDashboardCapsules(
  capsules: SovereignCapsule[],
  {
    activeTypes,
    activeTiers,
    activeSubtypes,
    searchQuery = '',
    sortOption,
  }: ProcessVaultDashboardCapsulesArgs,
) {
  let result = capsules;

  if (activeTypes.size > 0) {
    result = result.filter((capsule) => {
      const type = capsule.metadata.type;
      return type ? activeTypes.has(type) : false;
    });
  }

  if (activeTiers.size > 0) {
    result = result.filter((capsule) => {
      const tier = capsule.metadata.tier;
      return typeof tier === 'number' ? activeTiers.has(tier) : false;
    });
  }

  if (activeSubtypes.size > 0) {
    result = result.filter((capsule) => {
      const subtype = capsule.metadata.subtype;
      return subtype ? activeSubtypes.has(subtype) : false;
    });
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    result = result.filter((capsule) => {
      const name =
        typeof capsule.metadata.name === 'string'
          ? capsule.metadata.name
          : '';
      const summary =
        typeof capsule.neuro_concentrate.summary === 'string'
          ? capsule.neuro_concentrate.summary
          : '';
      return (
        capsule.metadata.capsule_id.toLowerCase().includes(normalizedQuery) ||
        name.toLowerCase().includes(normalizedQuery) ||
        summary.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  return sortCapsules(result, sortOption);
}

export function useVaultDashboardState(
  capsules: SovereignCapsule[],
  { selectionStorageKey }: { selectionStorageKey?: string } = {},
) {
  const [view, setView] = useState<VaultViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<CapsuleType>>(new Set());
  const [activeTiers, setActiveTiers] = useState<Set<CapsuleTier>>(new Set());
  const [activeSubtypes, setActiveSubtypes] = useState<Set<CapsuleSubtype>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('date-new');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);

  const processedCapsules = useMemo(() => {
    return processVaultDashboardCapsules(capsules, {
      activeTypes,
      activeTiers,
      activeSubtypes,
      searchQuery: debouncedSearch,
      sortOption,
    });
  }, [capsules, activeSubtypes, activeTiers, activeTypes, debouncedSearch, sortOption]);

  useEffect(() => {
    if (!selectionStorageKey || typeof window === 'undefined') {
      return;
    }

    try {
      const rawValue = window.sessionStorage.getItem(selectionStorageKey);
      if (!rawValue) {
        setSelectedIds(new Set());
        return;
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        setSelectedIds(new Set());
        return;
      }

      setSelectedIds(
        new Set(parsedValue.filter((value): value is string => typeof value === 'string')),
      );
    } catch {
      setSelectedIds(new Set());
    }
  }, [selectionStorageKey]);

  useEffect(() => {
    if (!selectionStorageKey || typeof window === 'undefined') {
      return;
    }

    if (selectedIds.size === 0) {
      window.sessionStorage.removeItem(selectionStorageKey);
      return;
    }

    window.sessionStorage.setItem(selectionStorageKey, JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds, selectionStorageKey]);

  const resetSelection = () => setSelectedIds(new Set());

  const toggleTypeFilter = (type: CapsuleType) => {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setActiveTypes(next);
    resetSelection();
  };

  const toggleTierFilter = (tier: CapsuleTier) => {
    const next = new Set(activeTiers);
    if (next.has(tier)) next.delete(tier);
    else next.add(tier);
    setActiveTiers(next);
    resetSelection();
  };

  const toggleSubtypeFilter = (subtype: CapsuleSubtype) => {
    const next = new Set(activeSubtypes);
    if (next.has(subtype)) next.delete(subtype);
    else next.add(subtype);
    setActiveSubtypes(next);
    resetSelection();
  };

  const clearFilters = () => {
    setActiveTypes(new Set());
    setActiveTiers(new Set());
    setActiveSubtypes(new Set());
    resetSelection();
  };

  const clearTypeFilters = () => {
    setActiveTypes(new Set());
    resetSelection();
  };

  const clearTierFilters = () => {
    setActiveTiers(new Set());
    resetSelection();
  };

  const clearSubtypeFilters = () => {
    setActiveSubtypes(new Set());
    resetSelection();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetSelection();
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
  };

  const handleViewChange = (nextView: VaultViewMode) => {
    setView(nextView);
    resetSelection();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const allIds = processedCapsules.map((capsule) => capsule.metadata.capsule_id);
    setSelectedIds(new Set(allIds));
  };

  return {
    view,
    searchQuery,
    sortOption,
    activeTypes,
    activeTiers,
    activeSubtypes,
    selectedIds,
    processedCapsules,
    resetSelection,
    toggleTypeFilter,
    toggleTierFilter,
    toggleSubtypeFilter,
    clearFilters,
    clearTypeFilters,
    clearTierFilters,
    clearSubtypeFilters,
    handleSearchChange,
    handleSortChange,
    handleViewChange,
    toggleSelection,
    selectAllVisible,
  };
}

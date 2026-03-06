import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { CapsuleTier, CapsuleType, SovereignCapsule } from '@/types/capsule';
import { sortCapsules, type SortOption } from '@/utils/sortUtils';
import type { VaultViewMode } from '@/components/vault/VaultControls';

export function useVaultDashboardState(capsules: SovereignCapsule[]) {
  const [view, setView] = useState<VaultViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<CapsuleType>>(new Set());
  const [activeTiers, setActiveTiers] = useState<Set<CapsuleTier>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('date-new');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);

  const processedCapsules = useMemo(() => {
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

    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase();
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
          capsule.metadata.capsule_id.toLowerCase().includes(lowerQuery) ||
          name.toLowerCase().includes(lowerQuery) ||
          summary.toLowerCase().includes(lowerQuery)
        );
      });
    }

    return sortCapsules(result, sortOption);
  }, [capsules, activeTiers, activeTypes, debouncedSearch, sortOption]);

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

  const clearFilters = () => {
    setActiveTypes(new Set());
    setActiveTiers(new Set());
    resetSelection();
  };

  const clearTierFilters = () => {
    setActiveTiers(new Set());
    resetSelection();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetSelection();
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
    resetSelection();
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
    selectedIds,
    processedCapsules,
    resetSelection,
    toggleTypeFilter,
    toggleTierFilter,
    clearFilters,
    clearTierFilters,
    handleSearchChange,
    handleSortChange,
    handleViewChange,
    toggleSelection,
    selectAllVisible,
  };
}

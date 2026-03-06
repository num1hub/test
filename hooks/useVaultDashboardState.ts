import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { CapsuleType, SovereignCapsule } from '@/types/capsule';
import { sortCapsules, type SortOption } from '@/utils/sortUtils';
import type { VaultViewMode } from '@/components/vault/VaultControls';

export function useVaultDashboardState(capsules: SovereignCapsule[]) {
  const [view, setView] = useState<VaultViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<CapsuleType>>(new Set());
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

    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase();
      result = result.filter((capsule) => {
        const summary =
          typeof capsule.neuro_concentrate.summary === 'string'
            ? capsule.neuro_concentrate.summary
            : '';
        return (
          capsule.metadata.capsule_id.toLowerCase().includes(lowerQuery) ||
          summary.toLowerCase().includes(lowerQuery)
        );
      });
    }

    return sortCapsules(result, sortOption);
  }, [capsules, activeTypes, debouncedSearch, sortOption]);

  const resetSelection = () => setSelectedIds(new Set());

  const toggleTypeFilter = (type: CapsuleType) => {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setActiveTypes(next);
    resetSelection();
  };

  const clearFilters = () => {
    setActiveTypes(new Set());
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
    selectedIds,
    processedCapsules,
    resetSelection,
    toggleTypeFilter,
    clearFilters,
    handleSearchChange,
    handleSortChange,
    handleViewChange,
    toggleSelection,
    selectAllVisible,
  };
}

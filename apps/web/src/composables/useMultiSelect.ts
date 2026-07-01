/**
 * Multi-select composable for list items.
 * Manages a Set of selected IDs with toggle, select-all, and clear.
 */
import { computed, ref, watch } from "vue";
import type { Ref } from "vue";

export interface MultiSelectAPI<T extends { id: string }> {
  selectedIds: Ref<Set<string>>;
  someSelected: Ref<boolean>;
  isAllSelected: Ref<boolean>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
}

export function useMultiSelect<T extends { id: string }>(
  items: Ref<T[]>
): MultiSelectAPI<T> {
  const selectedIds = ref(new Set<string>()) as Ref<Set<string>>;

  const someSelected = computed(() => selectedIds.value.size > 0);

  const isAllSelected = computed(
    () => items.value.length > 0 && selectedIds.value.size === items.value.length
  );

  function toggleOne(id: string) {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  }

  function toggleAll() {
    if (isAllSelected.value) {
      selectedIds.value = new Set();
    } else {
      selectedIds.value = new Set(items.value.map((i) => i.id));
    }
  }

  function clear() {
    selectedIds.value = new Set();
  }

  // Remove stale ids when items change
  watch(items, (list) => {
    const valid = new Set(list.map((i) => i.id));
    const pruned = new Set([...selectedIds.value].filter((id) => valid.has(id)));
    if (pruned.size !== selectedIds.value.size) {
      selectedIds.value = pruned;
    }
  });

  return { selectedIds, someSelected, isAllSelected, toggleOne, toggleAll, clear };
}

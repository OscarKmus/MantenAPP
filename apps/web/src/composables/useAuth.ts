import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

/**
 * Composable wrapping the auth store to expose role helpers.
 * Use this in components that need role-aware UI gating.
 */
export function useAuth() {
  const store = useAuthStore();

  const user = computed(() => store.user);
  const isAdmin = computed(() => store.isAdmin);
  const role = computed(() => store.role);

  return {
    user,
    isAdmin,
    role,
    canEdit: store.canEdit,
    canDelete: store.canDelete,
    login: store.login,
    logout: store.logout,
  };
}

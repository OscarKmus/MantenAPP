/**
 * Toast notification composable.
 * Provides inject/provide-based toast system.
 * Use ToastProvider.vue at app root to render toasts.
 */
import { inject, provide, ref } from "vue";
import type { InjectionKey, Ref } from "vue";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastAPI {
  toasts: Ref<Toast[]>;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  dismiss: (id: number) => void;
}

const TOAST_KEY: InjectionKey<ToastAPI> = Symbol("toast");

let nextId = 0;

export function provideToast(): ToastAPI {
  const toasts = ref<Toast[]>([]);

  function add(message: string, type: ToastType) {
    const id = ++nextId;
    toasts.value.push({ id, message, type });
    setTimeout(() => dismiss(id), 4000);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  const api: ToastAPI = {
    toasts,
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
    info: (msg) => add(msg, "info"),
    dismiss,
  };

  provide(TOAST_KEY, api);
  return api;
}

export function useToast(): Pick<ToastAPI, "success" | "error" | "info"> {
  const api = inject<ToastAPI>(TOAST_KEY);
  if (!api) {
    throw new Error("useToast() requires a <ToastProvider> ancestor.");
  }
  return { success: api.success, error: api.error, info: api.info };
}

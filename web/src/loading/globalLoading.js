// src/loading/globalLoading.js
// Loader global por contador (soporta múltiples requests simultáneas)

const emitter = new EventTarget();
let count = 0;

function emit() {
  emitter.dispatchEvent(new CustomEvent("global-loading", { detail: { count } }));
}

export const globalLoading = {
  on(handler) {
    const fn = (e) => handler(e.detail.count);
    emitter.addEventListener("global-loading", fn);
    return () => emitter.removeEventListener("global-loading", fn);
  },
  start() {
    count += 1;
    emit();
  },
  stop() {
    count = Math.max(0, count - 1);
    emit();
  },
  peek() {
    return count;
  },
};

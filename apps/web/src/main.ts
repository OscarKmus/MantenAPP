import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { usePushSubscription } from "./composables/usePushSubscription";
import "./app.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");

// Register service worker after app mounts (only if supported)
if ("serviceWorker" in navigator && "PushManager" in window) {
  const { registerServiceWorker } = usePushSubscription();
  registerServiceWorker().catch(() => {
    // SW registration failed — push won't work but app is fine
  });
}

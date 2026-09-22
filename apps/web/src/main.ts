import "vant/lib/index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app-shell.css";
import "./styles/life.css";
import "./styles/home.css";
import "./styles/agreements.css";
import "./styles/stake.css";
import "./styles/history.css";
import "./styles/vouchers.css";
import "./styles/voucher-ticket.css";

import { createApp } from "vue";
import Vant from "vant";
import App from "./App.vue";

createApp(App).use(Vant).mount("#app");

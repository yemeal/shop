import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './assets/design-tokens.css';
import ru from 'element-plus/es/locale/lang/ru';

import App from './App.vue';
import { router } from './router';

// создание экземпляра vue приложения
const app = createApp(App);

// подключение менеджера состояния pinia
const pinia = createPinia();
app.use(pinia);

// подключение библиотеки element plus с русской локализацией
app.use(ElementPlus, { locale: ru });

// подключение vue router
app.use(router);

// монтирование приложения в div #app
app.mount('#app');

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import './styles/index.css'
import './styles/app.css'
import 'element-plus/dist/index.css'
import './styles/theme.css'

createApp(App).use(router).use(ElementPlus, { locale: zhCn, zIndex: 3000 }).mount('#app')

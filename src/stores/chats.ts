import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { tgParserApi, type Chat } from '@/api/api';

export const useChatsStore = defineStore(
  'chats',
  () => {
    // Состояние
    const chats = ref<Chat[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastFetched = ref<number | null>(null);

    // Геттеры
    const hasChats = () => chats.value.length > 0;
    const getChatById = (id: string) => chats.value.find((chat) => chat.id === id);

    // Действия
    async function fetchChats(force = false) {
      // Если уже есть данные и не требуется принудительное обновление
      if (!force && chats.value.length > 0 && lastFetched.value) {
        const age = Date.now() - lastFetched.value;

        if (age < 24 * 60 * 60 * 1000) {
          return;
        }
      }

      loading.value = true;
      error.value = null;

      try {
        const response = await tgParserApi.getChats();

        if (response.success) {
          chats.value = response.data;
          lastFetched.value = Date.now();
        } else {
          error.value = 'Не удалось загрузить чаты';
        }
      } catch (err) {
        console.error('Error loading chats:', err);
        error.value = 'Ошибка соединения с сервером';
      } finally {
        loading.value = false;
      }
    }

    function clearChats() {
      chats.value = [];
      lastFetched.value = null;
      error.value = null;
    }

    return {
      // Состояние
      chats,
      loading,
      error,
      lastFetched,
      // Геттеры
      hasChats,
      getChatById,
      // Действия
      fetchChats,
      clearChats,
    };
  },
  {
    persist: {
      key: 'mezenrealism_chats_store',
      storage: localStorage,
      pick: ['chats', 'lastFetched'],
    },
  },
);

// HMR для разработки
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatsStore, import.meta.hot));
}

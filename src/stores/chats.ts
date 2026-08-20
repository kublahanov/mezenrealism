import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { tgParserApi, type Chat } from '@/api/api';

export const useChatsStore = defineStore(
  'chats',
  () => {
    /**
     * Состояния.
     */

    const chats = ref<Chat[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastFetched = ref<number | null>(null);

    // Отслеживаем, для каких чатов загружается статистика
    const loadingStats = ref<Set<string>>(new Set());
    // Отслеживаем ошибки статистики
    const statsErrors = ref<Map<string, string>>(new Map());

    /**
     * Геттеры.
     */

    const hasChats = () => chats.value.length > 0;
    const getChatById = (id: string) => chats.value.find((chat) => chat.id === id);

    /**
     * Действия.
     */

    // Загрузка списка чатов (без статистики)
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

          // После загрузки списка запускаем параллельную загрузку статистики
          void loadAllStats();
        } else {
          error.value = 'Не удалось загрузить чаты';
        }
      } catch (err) {
        console.error('Ошибка соединения с сервером:', err);
        error.value = 'Ошибка соединения с сервером';
      } finally {
        loading.value = false;
      }
    }

    // Загрузка статистики для одного чата
    async function fetchChatStats(chatId: string) {
      // Если статистика уже есть, не загружаем повторно
      const chat = chats.value.find((c) => c.id === chatId);

      if (chat?.messages_count !== undefined) {
        return;
      }

      loadingStats.value.add(chatId);
      statsErrors.value.delete(chatId);

      try {
        const response = await tgParserApi.getChatStats(chatId);

        if (response.success) {
          const stats = response.data;
          // Обновляем данные чата
          const idx = chats.value.findIndex((c) => c.id === chatId);

          if (idx !== -1) {
            chats.value[idx] = {
              ...chats.value[idx],
              messages_count: stats.messages_count || 0,
              media_count: stats.media_count || 0,
              first_message: stats.first_message || null,
              last_message: stats.last_message || null,
            } as Chat;
          }
        } else {
          statsErrors.value.set(chatId, 'Не удалось загрузить статистику для чатов');
        }
      } catch (error) {
        console.error(`Ошибка соединения с сервером (чат ${chatId}):`, error);
        statsErrors.value.set(chatId, 'Ошибка соединения с сервером');
      } finally {
        loadingStats.value.delete(chatId);
      }
    }

    // Параллельная загрузка статистики для всех чатов
    async function loadAllStats() {
      const chatIds = chats.value.map((c) => c.id);
      // Загружаем статистику параллельно с ограничением (чтобы не перегружать сервер)
      const batchSize = 5;

      for (let i = 0; i < chatIds.length; i += batchSize) {
        const batch = chatIds.slice(i, i + batchSize);

        await Promise.all(batch.map((id) => fetchChatStats(id)));

        // Небольшая задержка между пачками
        if (i + batchSize < chatIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    // Принудительное обновление статистики для всех чатов
    async function refreshStats() {
      // Сбрасываем существующую статистику
      chats.value = chats.value.map((chat) => ({
        ...chat,
        messages_count: null,
        media_count: null,
        first_message: null,
        last_message: null,
      }));

      await loadAllStats();
    }

    // Очистка информации о чатах
    function clearChats() {
      chats.value = [];
      lastFetched.value = null;
      error.value = null;
      loadingStats.value.clear();
      statsErrors.value.clear();
    }

    return {
      // Состояние
      chats,
      loading,
      error,
      lastFetched,
      statsErrors,
      // Геттеры
      hasChats,
      getChatById,
      // Действия
      fetchChats,
      fetchChatStats,
      refreshStats,
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

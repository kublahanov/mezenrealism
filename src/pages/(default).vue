<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>Мезенреализм - Архив</q-toolbar-title>
        <div class="text-caption q-mr-md" v-if="stats">
          <span class="q-mr-sm">💬 {{ stats.messages }}</span>
          <span>🖼️ {{ stats.media }}</span>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-scroll-area class="full-height full-width">
        <q-list>
          <q-item-label header class="q-px-md q-py-sm">
            <div class="row items-center justify-between">
              <div class="text-h6 text-bold text-primary">Список чатов</div>
              <q-btn
                flat
                round
                dense
                icon="refresh"
                size="sm"
                :loading="chatsStore.loading"
                @click="refreshChats"
              >
                <q-tooltip anchor="bottom middle" self="top middle">
                  Обновить список чатов
                </q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="close" class="lt-md" @click="closeDrawer" />
            </div>
          </q-item-label>

          <!-- Состояние загрузки -->
          <q-banner v-if="chatsStore.loading" inline-actions class="text-black bg-grey-4 q-pa-md">
            <template v-slot:avatar>
              <q-icon name="refresh" color="grey" size="sm" />
            </template>
            Список чатов обновляется
            <!-- <q-spinner size="2em" /> -->
          </q-banner>

          <!-- Ошибка -->
          <q-banner v-else-if="chatsStore.error" inline-actions class="text-white bg-red-8 q-pa-md">
            <template v-slot:avatar>
              <q-icon name="signal_wifi_off" color="white" size="sm" />
            </template>
            Не удалось загрузить чаты
          </q-banner>

          <!-- Список чатов -->
          <template v-else>
            <q-item
              v-for="chat in chatsStore.chats"
              :key="chat.id"
              clickable
              :active="isChatActive(chat.id)"
              :to="`/chat/${chat.id}`"
              @click="closeDrawerIfMobile"
            >
              <q-item-section>
                <q-item-label class="ellipsis">{{ chat.title }}</q-item-label>
                <q-item-label caption>
                  <span class="text-grey-6">
                    <span>💬 {{ chat.messages_count || 0 }}</span>
                    <span v-if="chat.media_count">· 🖼️ {{ chat.media_count }}</span>
                  </span>
                </q-item-label>
              </q-item-section>
              <q-item-section side v-if="chat.forum">
                <q-badge color="orange" label="Форум" />
              </q-item-section>
            </q-item>

            <!-- Если чатов нет -->
            <q-banner
              v-if="chatsStore.chats.length === 0"
              inline-actions
              class="text-black bg-grey-4 q-pa-md"
            >
              <template v-slot:avatar>
                <q-icon name="cancel" color="grey" size="sm" />
              </template>
              Чаты не найдены
            </q-banner>
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { tgParserApi } from '@/api/api';
import { useChatsStore } from '@/stores/chats';

// Используем store
const chatsStore = useChatsStore();

const route = useRoute();
const leftDrawerOpen = ref(false);
const stats = ref<{ messages: number; media: number } | null>(null);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function closeDrawerIfMobile() {
  if (window.innerWidth < 1024) {
    leftDrawerOpen.value = false;
  }
}

function isChatActive(chatId: string): boolean {
  return (route.params as { id?: string }).id === chatId;
}

async function loadStats() {
  try {
    const response = await tgParserApi.getStats();

    if (response.success) {
      stats.value = {
        messages: response.data.messages,
        media: response.data.media,
      };
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
  }
}

// Функция обновления
function refreshChats() {
  void chatsStore.fetchChats(true);
}

function closeDrawer() {
  leftDrawerOpen.value = false;
}

onMounted(() => {
  void loadStats();
  void chatsStore.fetchChats(false);
});
</script>

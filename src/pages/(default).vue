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

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="320">
      <q-scroll-area style="height: 100%">
        <q-list>
          <q-item-label header class="q-px-md q-py-sm">
            <div class="row items-center justify-between">
              <div class="text-h6 text-bold text-primary">Список чатов</div>
              <q-btn flat round dense icon="close" class="lt-md" @click="closeDrawer" />
            </div>
          </q-item-label>

          <!-- Состояние загрузки -->
          <div v-if="chatsLoading" class="row justify-center q-pa-md">
            <q-spinner size="2em" />
          </div>

          <!-- Ошибка -->
          <q-banner v-else-if="isChatsError" inline-actions class="text-white bg-red q-pa-md">
            <template v-slot:avatar>
              <q-icon name="signal_wifi_off" color="white" size="sm" />
            </template>
            Не удалось загрузить чаты
          </q-banner>

          <!-- Список чатов -->
          <template v-else>
            <q-item
              v-for="chat in chats"
              :key="chat.id"
              clickable
              :active="isChatActive(chat.id)"
              :to="`/chat/${chat.id}`"
              @click="closeDrawerIfMobile"
            >
              <q-item-section avatar>
                <q-icon :name="chat.peer_type === 'channel' ? 'rss_feed' : 'chat'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ chat.title }}</q-item-label>
                <q-item-label caption>
                  <span class="text-grey-6">
                    {{ chat.messages_count || 0 }} сообщ.
                    <span v-if="chat.media_count">· 🖼️ {{ chat.media_count }}</span>
                  </span>
                </q-item-label>
              </q-item-section>
              <q-item-section side v-if="chat.forum">
                <q-badge color="orange" label="Форум" />
              </q-item-section>
            </q-item>

            <!-- Если чатов нет -->
            <div v-if="chats.length === 0" class="q-pa-md text-grey-7 text-center">
              Чаты не найдены
            </div>
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
import { tgParserApi, type Chat } from '@/api/api';

const route = useRoute();
const leftDrawerOpen = ref(false);
const stats = ref<{ messages: number; media: number } | null>(null);
const chats = ref<Chat[]>([]);
const chatsLoading = ref(true);
const isChatsError = ref<boolean>(false);

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

async function loadChats() {
  chatsLoading.value = true;
  isChatsError.value = false;

  try {
    const response = await tgParserApi.getChats();

    if (response.success) {
      chats.value = response.data;
    } else {
      isChatsError.value = true;
    }
  } catch (error) {
    console.error('Error loading chats:', error);
    isChatsError.value = true;
  } finally {
    chatsLoading.value = false;
  }
}

function closeDrawer() {
  leftDrawerOpen.value = false;
}

onMounted(() => {
  void loadStats();
  void loadChats();
});
</script>

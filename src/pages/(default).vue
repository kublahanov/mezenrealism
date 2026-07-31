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
      <q-list>
        <q-item-label header>Список чатов</q-item-label>
        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="chat" />
          </q-item-section>
          <q-item-section>Чаты</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { tgParserApi } from '@/api/api';

const leftDrawerOpen = ref(false);
const stats = ref<{ messages: number; media: number } | null>(null);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
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
    console.warn('Failed to load stats:', error);
  }
}

onMounted(() => {
  void loadStats();
});
</script>

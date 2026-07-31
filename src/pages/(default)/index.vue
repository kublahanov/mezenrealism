<template>
  <q-page padding>
    <!-- Поиск -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12">
        <q-input
          v-model="searchQuery"
          label="Поиск по чатам"
          dense
          outlined
          clearable
          @update:model-value="filterChats"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Состояния загрузки/ошибки -->
    <div v-if="loading" class="row justify-center q-mt-lg">
      <q-spinner size="3em" />
    </div>

    <div v-else-if="error" class="row justify-center q-mt-lg">
      <q-banner dense class="bg-negative text-white">
        {{ error }}
      </q-banner>
    </div>

    <!-- Список чатов -->
    <div v-else class="row q-col-gutter-md">
      <div v-for="chat in filteredChats" :key="chat.id" class="col-12 col-sm-6 col-md-4">
        <q-card class="chat-card" clickable @click="openChat(chat.id)">
          <q-card-section>
            <div class="text-h6 ellipsis">
              {{ chat.title }}
            </div>
            <div class="text-caption text-grey">@{{ chat.username || 'без юзернейма' }}</div>
          </q-card-section>

          <q-separator />

          <q-card-section class="row q-col-gutter-sm">
            <div class="col-6 text-caption">
              <q-icon name="chat" size="xs" />
              {{ chat.messages_count || 0 }} сообщ.
            </div>
            <div class="col-6 text-caption">
              <q-icon name="image" size="xs" />
              {{ chat.media_count || 0 }} медиа
            </div>
            <div class="col-12 text-caption text-grey">
              <q-icon name="schedule" size="xs" />
              {{ chat.last_message ? formatDate(chat.last_message) : '—' }}
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-badge :color="chat.peer_type === 'channel' ? 'primary' : 'secondary'">
              {{ chat.peer_type === 'channel' ? '📢 Канал' : '💬 Группа' }}
            </q-badge>
            <q-badge v-if="chat.forum" color="orange"> Форум </q-badge>
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { type Chat, tgParserApi } from '@/api/api';

const router = useRouter();
const chats = ref<Chat[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');

const filteredChats = computed(() => {
  if (!searchQuery.value) {
    return chats.value;
  }

  const q = searchQuery.value.toLowerCase();

  return chats.value.filter(
    (chat) =>
      chat.title.toLowerCase().includes(q) ||
      (chat.username && chat.username.toLowerCase().includes(q)),
  );
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function openChat(chatId: string) {
  await router.push(`/chat/${chatId}`);
}

async function loadChats() {
  loading.value = true;
  error.value = null;

  try {
    const response = await tgParserApi.getChats();

    if (response.success) {
      chats.value = response.data;
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

function filterChats() {
  // computed автоматически обновляется
}

onMounted(() => {
  void loadChats();
});
</script>

<style scoped>
.chat-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.chat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

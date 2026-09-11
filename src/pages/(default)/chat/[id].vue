<template>
  <q-page padding>
    <!-- Информация о чате -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center">
          <div class="col">
            <div class="text-h5">{{ chatTitle }}</div>
            <div class="text-caption text-grey">@{{ chatUsername || '-' }}</div>
          </div>
          <div class="col-auto">
            <q-badge :color="chatForum ? 'orange' : 'primary'">
              {{ chatForum ? 'Форум' : chatType === 'channel' ? 'Канал' : 'Группа' }}
            </q-badge>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Темы (для форумов) -->
    <div v-if="showTopics && topics.length > 0" class="q-mb-md">
      <div class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12">
          <q-btn
            flat
            :color="currentTopic === 0 ? 'primary' : 'grey-8'"
            label="📢 Все сообщения"
            @click="selectTopic(0)"
            size="sm"
          />
          <q-btn
            v-for="topic in topics"
            :key="topic.id"
            flat
            :color="currentTopic === topic.id ? 'primary' : 'grey-8'"
            :label="topic.title + (topic.is_pinned ? ' 📌' : '')"
            @click="selectTopic(topic.id)"
            size="sm"
          />
        </div>
      </div>
    </div>

    <!-- Сообщения -->
    <div v-if="loadingMessages" class="row justify-center q-mt-lg">
      <q-spinner size="3em" />
    </div>

    <div v-else-if="messagesError" class="row justify-center q-mt-lg">
      <q-banner dense class="bg-negative text-white">
        {{ messagesError }}
      </q-banner>
    </div>

    <div v-else>
      <div v-if="messages.length === 0" class="row justify-center q-mt-lg">
        <div class="text-grey">Сообщений не найдено</div>
      </div>

      <div v-else>
        <q-list bordered separator>
          <!-- Список сообщений -->
          <q-item v-for="msg in messages" :key="msg.id">
            <q-item-section>
              <!-- Метаданные сообщения -->
              <q-item-label caption>
                <!-- Данные о редактировании слева -->
                <span>
                  {{ formatDateTime(msg.date) }}
                </span>
                <span v-if="msg.edit_date" class="q-ml-sm text-grey-6">
                  ✏️ {{ formatDateTime(msg.edit_date) }}
                </span>
                <!-- Остальные данные справа -->
                <span v-if="msg.views" class="q-ml-sm float-right">
                  👁️ {{ msg.views }}
                </span>
                <span v-if="msg.forwards" class="q-ml-sm float-right">
                  🔄 {{ msg.forwards }}
                </span>
                <span v-if="msg.media_count > 0" class="q-ml-sm float-right">
                  🖼️ {{ msg.media_count }}
                </span>
              </q-item-label>
              <!-- Текст сообщения -->
              <q-item-label v-if="msg.text" class="message-text">
                <span v-html="formatMessage(msg.text)"></span>
              </q-item-label>
              <!-- Медиа -->
              <div v-if="msg.media && msg.media.length > 0" class="message-media q-mt-sm">
                <div v-for="media in msg.media" :key="media.id" class="media-item q-mb-sm">
                  <!-- Фото -->
                  <q-img
                    v-if="media.media_type === 'photo'"
                    :src="`${API_BASE}/media/file/${media.id}`"
                    :ratio="media.width && media.height ? media.width / media.height : 1"
                    spinner-color="primary"
                    style="max-width: 400px; border-radius: 8px"
                    @click="openMedia(media)"
                  />
                  <!-- Видео -->
                  <video
                    v-else-if="media.media_type === 'video'"
                    :src="`${API_BASE}/media/file/${media.id}`"
                    controls
                    preload="metadata"
                    style="max-width: 400px; border-radius: 8px"
                  />
                  <!-- Аудио / Голосовое -->
                  <audio
                    v-else-if="media.media_type === 'audio' || media.media_type === 'voice'"
                    :src="`${API_BASE}/media/file/${media.id}`"
                    controls
                    preload="metadata"
                    style="width: 100%; max-width: 400px"
                  />
                  <!-- Стикер -->
                  <img
                    v-else-if="media.media_type === 'sticker'"
                    :src="`${API_BASE}/media/file/${media.id}`"
                    style="max-width: 150px"
                    alt=""
                  />
                  <!-- Документ / другой файл -->
                  <a
                    v-else
                    :href="`${API_BASE}/media/file/${media.id}`"
                    target="_blank"
                    class="media-file-link"
                  >
                    <q-icon name="attach_file" />
                    {{ media.file_name || 'Файл' }}
                    <span v-if="media.file_size" class="text-grey-6">
                      ({{ formatSize(media.file_size) }})
                    </span>
                  </a>
                </div>
              </div>
              <!-- Данные связанные с ответом -->
              <q-item-label v-if="msg.reply_to_msg_id" caption>
                ↪️ Ответ на <a :href="`#msg-${msg.reply_to_msg_id}`">#{{ msg.reply_to_msg_id }}</a>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Пагинация -->
        <div class="row justify-center q-mt-md">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            direction-links
            boundary-links
            @update:model-value="loadMessages"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Media } from '@/api/api';
import { API_BASE, type ChatRouteParams, type Message, tgParserApi, type Topic } from '@/api/api';
import { formatMessage } from '@/utils/formatMessage';
// import { useQuasar } from 'quasar';

const route = useRoute();
const router = useRouter();

const chatId = computed(() => (route.params as ChatRouteParams).id);
const currentPage = ref(1);
const currentTopic = ref(0);

const chatTitle = ref('Загрузка...');
const chatUsername = ref<string | null>(null);
const chatType = ref<'channel' | 'supergroup' | 'group' | 'chat'>('chat');
const chatForum = ref(false);

const topics = ref<Topic[]>([]);
const showTopics = ref(false);

const messages = ref<Message[]>([]);
const totalMessages = ref(0);
const totalPages = ref(1);
const loadingMessages = ref(false);
const messagesError = ref<string | null>(null);

// const $q = useQuasar();

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' ГБ';
}

// function openMedia(media: Media) {
//   const url = `${API_BASE}/media/file/${media.id}`;
//
//   if (media.media_type === 'photo') {
//     $q.dialog({
//       maximized: true,
//       component: 'q-img',
//     });
//   }
// }

function openMedia(media: Media) {
  window.open(`${API_BASE}/media/file/${media.id}`, '_blank');
}

async function loadChatInfo() {
  try {
    const response = await tgParserApi.getChat(chatId.value);

    if (response.success) {
      chatTitle.value = response.data.title;
      chatUsername.value = response.data.username;
      chatType.value = response.data.peer_type;
      chatForum.value = response.data.is_forum || false;
    }
  } catch (error) {
    console.error('Error loading chat info:', error);
  }
}

async function loadTopics() {
  topics.value = [];
  showTopics.value = false;

  try {
    const response = await tgParserApi.getTopics(chatId.value);

    if (response.success && response.data.length > 0) {
      topics.value = response.data;
      showTopics.value = true;
    }
  } catch (error) {
    console.warn('Topics not available:', error);
  }
}

async function loadMessages() {
  loadingMessages.value = true;
  messagesError.value = null;

  try {
    const response = await tgParserApi.getMessages(
      chatId.value,
      currentPage.value,
      currentTopic.value,
    );

    if (response.success) {
      messages.value = response.data.messages;
      totalMessages.value = response.data.total;
      totalPages.value = response.data.total_pages;
    } else {
      messagesError.value = 'Не удалось загрузить сообщения';
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    messagesError.value = 'Ошибка соединения с сервером';
  } finally {
    loadingMessages.value = false;
  }
}

function selectTopic(topicId: number) {
  currentTopic.value = topicId;
  currentPage.value = 1;

  void loadMessages();

  void router.replace({
    query: {
      ...route.query,
      topic: topicId === 0 ? undefined : String(topicId),
      page: undefined,
    },
  });
}

watch(
  () => (route.params as ChatRouteParams).id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      currentPage.value = 1;
      currentTopic.value = 0;

      // Сброс тем
      topics.value = [];
      showTopics.value = false;

      void loadChatInfo();
      void loadTopics();
      void loadMessages();
    }
  },
);

onMounted(() => {
  const queryTopic = route.query.topic;

  if (queryTopic) {
    currentTopic.value = Number(queryTopic);
  }

  const queryPage = route.query.page;

  if (queryPage) {
    currentPage.value = Number(queryPage);
  }

  void loadChatInfo();
  void loadTopics();
  void loadMessages();
});
</script>

<style scoped>
a {
  color: #1976d2;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-text :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
}
</style>

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
          <q-item v-for="msg in messages" :key="msg.id">
            <q-item-section>
              <q-item-label caption>
                <span class="text-primary">#{{ msg.id }}</span>
                {{ formatDateTime(msg.date) }}
                <span v-if="msg.views" class="q-ml-sm"> 👁️ {{ msg.views }} </span>
                <span v-if="msg.forwards" class="q-ml-sm"> 🔄 {{ msg.forwards }} </span>
                <span v-if="msg.edit_date" class="q-ml-sm text-grey-6">
                  ✏️ {{ formatDateTime(msg.edit_date) }}
                </span>
              </q-item-label>
              <q-item-label v-if="msg.text">
                {{ msg.text }}
              </q-item-label>
              <q-item-label v-if="msg.media_count > 0" caption class="text-primary">
                🖼️ Медиа: {{ msg.media_count }}
              </q-item-label>
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
import { type ChatRouteParams, type Message, tgParserApi, type Topic } from '@/api/api';

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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
</style>

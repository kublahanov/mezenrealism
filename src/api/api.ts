import { api } from '@/boot/axios';

export interface Chat {
  id: string;
  title: string;
  username: string | null;
  peer_type: 'channel' | 'supergroup' | 'group' | 'chat';
  is_forum: boolean;
  messages_count?: number | null;
  media_count?: number | null;
  first_message?: string | null;
  last_message?: string | null;
}

export interface Message {
  id: number;
  chat_id: string;
  topic_id: number | null;
  date: string;
  text: string | null;
  has_media: boolean;
  views: number | null;
  forwards: number | null;
  media_count: number;
  reply_to_msg_id: number | null;
  edit_date: string | null;
  media?: Media[];
}

export interface Topic {
  id: number;
  title: string;
  is_closed: boolean;
  is_pinned: boolean;
  messages_count: number;
  last_date: string | null;
}

export interface Media {
  id: number;
  media_type:
    | 'photo'
    | 'video'
    | 'document'
    | 'audio'
    | 'voice'
    | 'sticker'
    | 'geo'
    | 'contact'
    | 'poll'
    | 'webpage'
    | 'game'
    | 'invoice'
    | 'venue';
  mime_type: string | null;
  file_name: string | null;
  file_path: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  file_size: number | null;
}

export type ChatRouteParams = {
  id: string;
};

export const tgParserApi = {
  // Получить список чатов
  async getChats() {
    const response = await api.get<{ success: boolean; data: Chat[] }>('/chats');
    return response.data;
  },

  // Получить чат по ID
  async getChat(id: string) {
    const response = await api.get<{ success: boolean; data: Chat }>(`/chats/${id}`);
    return response.data;
  },

  // Получить статистику чата по ID
  async getChatStats(id: string) {
    const response = await api.get<{ success: boolean; data: Chat }>(`/chats/${id}/stats`);
    return response.data;
  },

  // Получить сообщения чата
  async getMessages(chatId: string, page: number = 1, topic: number = 0) {
    const response = await api.get<{
      success: boolean;
      data: {
        messages: Message[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
      };
    }>(`/chats/${chatId}/messages`, { params: { page, topic } });
    return response.data;
  },

  // Получить темы форума
  async getTopics(chatId: string) {
    const response = await api.get<{ success: boolean; data: Topic[] }>(`/topics/${chatId}`);
    return response.data;
  },

  // Получить сообщения темы
  async getTopicMessages(chatId: string, topicId: number, page: number = 1) {
    const response = await api.get<{
      success: boolean;
      data: {
        messages: Message[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
      };
    }>(`/topics/${chatId}/${topicId}/messages`, { params: { page } });
    return response.data;
  },

  // Поиск по сообщениям
  async searchMessages(chatId: string, query: string, page: number = 1) {
    const response = await api.get<{
      success: boolean;
      data: {
        messages: Message[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
      };
    }>(`/chats/${chatId}/search`, { params: { q: query, page } });
    return response.data;
  },

  // Получить общую статистику
  async getStats() {
    const response = await api.get<{
      success: boolean;
      data: {
        chats: number;
        messages: number;
        media: number;
        topics: number;
      };
    }>('/stats');
    return response.data;
  },
};

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

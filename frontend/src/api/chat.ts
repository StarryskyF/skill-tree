import client from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  nodeId?: string
  createdAt: string
}

export interface Chat {
  _id: string
  skillTreeId: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface ChatListItem {
  _id: string
  title: string
  preview: string
  createdAt: string
}

const BASE_URL = '/api'

function getToken(): string {
  try {
    const raw = localStorage.getItem('auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.token ?? ''
    }
  } catch {
    // ignore
  }
  return ''
}

export function createChat(skillTreeId: string) {
  return client.post<Chat>('/chats', { skillTreeId })
}

export function listChats(skillTreeId: string) {
  return client.get<ChatListItem[]>(`/chats?skillTreeId=${skillTreeId}`)
}

export function getChat(chatId: string) {
  return client.get<Chat>(`/chats/${chatId}`)
}

export async function* streamMessage(
  chatId: string,
  content: string,
  nodeId?: string,
): AsyncGenerator<string> {
  const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ content, nodeId }),
  })

  if (!res.ok || !res.body) {
    throw new Error('请求失败')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = JSON.parse(line.slice(6))
      if (json.type === 'chunk') yield json.content as string
      if (json.type === 'done') return
      if (json.type === 'error') throw new Error(json.message)
    }
  }
}

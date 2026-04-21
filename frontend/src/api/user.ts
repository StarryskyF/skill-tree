import client from './client'

export interface UserProfile {
  id: string
  username: string
  name: string
  avatar?: string
}

export interface UserStats {
  totalExp: number
  level: number
  levelName: string
  completedNodeCount: number
  treeCount: number
  streakDays: number
  nextLevelExp: number
  badges: string[]
}

export const userApi = {
  getProfile: () => client.get<UserProfile>('/users/me'),
  getStats: () => client.get<UserStats>('/users/me/stats'),
  updateProfile: (name: string) => client.put<UserProfile>('/users/me/profile', { name }),
  updatePassword: (oldPassword: string, newPassword: string) =>
    client.put<void>('/users/me/password', { oldPassword, newPassword }),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.postForm<UserProfile>('/users/me/avatar', form)
  },
}

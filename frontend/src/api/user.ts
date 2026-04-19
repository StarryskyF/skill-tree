import client from './client'

export interface UserProfile {
  id: string
  username: string
  name: string
  avatar?: string
}

export const userApi = {
  getProfile: () => client.get<UserProfile>('/api/users/me'),
  updateProfile: (name: string) => client.put<UserProfile>('/api/users/me/profile', { name }),
  updatePassword: (oldPassword: string, newPassword: string) =>
    client.put<void>('/api/users/me/password', { oldPassword, newPassword }),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.postForm<UserProfile>('/api/users/me/avatar', form)
  },
}

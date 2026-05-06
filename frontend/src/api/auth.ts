import { post } from './client'

export interface UserInfo {
  id: string
  username: string
  name: string
  avatar?: string
}

export interface LoginResponse {
  access_token: string
  user: UserInfo
}

export const authApi = {
  login: (username: string, password: string) =>
    post<LoginResponse>('/auth/login', { username, password }),
  register: (username: string, password: string, name: string) =>
    post<UserInfo>('/auth/register', { username, password, name }),
}

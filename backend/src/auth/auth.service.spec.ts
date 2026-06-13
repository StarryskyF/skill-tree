import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByUsername: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersService as any, jwtService as any);
  });

  it('rejects duplicate usernames during registration', async () => {
    usersService.findByUsername.mockResolvedValue({ username: 'alice' });

    await expect(service.register({ username: 'alice', password: 'secret123', name: 'Alice' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('logs in with a password-enabled user query and returns a token', async () => {
    const password = await bcrypt.hash('secret123', 10);
    usersService.findByUsername.mockResolvedValue({
      _id: { toString: () => 'user-1' },
      username: 'alice',
      password,
      name: 'Alice',
      avatar: '/uploads/avatars/a.png',
    });
    jwtService.sign.mockReturnValue('signed-token');

    const result = await service.login({ username: 'alice', password: 'secret123' });

    expect(usersService.findByUsername).toHaveBeenCalledWith('alice', true);
    expect(result).toEqual({
      access_token: 'signed-token',
      user: { id: 'user-1', username: 'alice', name: 'Alice', avatar: '/uploads/avatars/a.png' },
    });
  });

  it('rejects invalid login credentials', async () => {
    const password = await bcrypt.hash('secret123', 10);
    usersService.findByUsername.mockResolvedValue({
      _id: { toString: () => 'user-1' },
      username: 'alice',
      password,
      name: 'Alice',
    });

    await expect(service.login({ username: 'alice', password: 'wrong-password' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

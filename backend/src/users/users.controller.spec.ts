import { UsersController } from './users.controller';

describe('UsersController', () => {
  const usersService = {
    getProfile: jest.fn(),
    getUserStats: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
    updateAvatar: jest.fn(),
  };
  const skillTreeModel = {
    countDocuments: jest.fn(),
  };

  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as any, skillTreeModel as any);
  });

  it('returns public profile data from the user service', async () => {
    usersService.getProfile.mockResolvedValue({ id: 'user-1', username: 'alice', name: 'Alice' });

    const result = await controller.getProfile({ user: { id: 'user-1' } } as any);

    expect(usersService.getProfile).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: 'user-1', username: 'alice', name: 'Alice' });
    expect(JSON.stringify(result)).not.toContain('password');
  });
});

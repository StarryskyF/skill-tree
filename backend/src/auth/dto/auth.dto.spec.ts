import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('auth DTO validation', () => {
  it('accepts long but bounded passwords for login', async () => {
    const dto = new LoginDto();
    dto.username = 'alice';
    dto.password = 'a'.repeat(128);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects empty registration passwords', async () => {
    const dto = new RegisterDto();
    dto.username = 'alice';
    dto.password = '';
    dto.name = 'Alice';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});

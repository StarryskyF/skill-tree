import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    this.logger.log(`Register attempt: ${dto.username}`);
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    this.logger.log(`Login attempt: ${dto.username}`);
    return this.authService.login(dto);
  }
}

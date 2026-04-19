import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');
    const user = await this.usersService.create(dto);
    this.logger.log(`User registered: ${user.username}`);
    return { id: (user._id as any).toString(), username: user.username, name: user.name };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: (user._id as any).toString(), username: user.username };
    const access_token = this.jwtService.sign(payload);
    this.logger.log(`User logged in: ${user.username}`);
    return {
      access_token,
      user: { id: (user._id as any).toString(), username: user.username, name: user.name },
    };
  }
}

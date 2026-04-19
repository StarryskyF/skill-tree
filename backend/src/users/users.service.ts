import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({ username: dto.username, password: hash, name: dto.name });
    this.logger.log(`Creating user: ${dto.username}`);
    return user.save();
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating profile for user: ${id}`);
    const user = await this.userModel.findByIdAndUpdate(id, { name: dto.name }, { new: true }).exec();
    return { id: user._id, username: user.username, name: user.name, avatar: user.avatar };
  }

  async updatePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    this.logger.log(`Updating password for user: ${id}`);
    const user = await this.userModel.findById(id).exec();
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('旧密码不正确');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  async updateAvatar(id: string, avatarUrl: string) {
    this.logger.log(`Updating avatar for user: ${id}`);
    const user = await this.userModel.findByIdAndUpdate(id, { avatar: avatarUrl }, { new: true }).exec();
    return { id: user._id, username: user.username, name: user.name, avatar: user.avatar };
  }
}

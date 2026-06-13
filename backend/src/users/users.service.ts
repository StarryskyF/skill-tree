import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500];

function calcLevel(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

const LEVEL_NAMES = ['', '入门者', '学习者', '进阶者', '熟练者', '专家'];

const MILESTONE_BADGES: Array<{ id: string; name: string; check: (count: number, level: number) => boolean }> = [
  { id: 'first_node', name: '初出茅庐', check: (count) => count >= 1 },
  { id: 'ten_nodes', name: '势如破竹', check: (count) => count >= 10 },
  { id: 'thirty_nodes', name: '知识猎人', check: (count) => count >= 30 },
  { id: 'level_3', name: '升级达人', check: (_, level) => level >= 3 },
];

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
}

function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: String(user._id),
    username: user.username,
    name: user.name,
    avatar: user.avatar,
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByUsername(username: string, includePassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ username });
    if (includePassword) query.select('+password');
    return query.exec();
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

  async getProfile(id: string): Promise<PublicUser> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new BadRequestException('用户不存在');
    return toPublicUser(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUser> {
    this.logger.log(`Updating profile for user: ${id}`);
    const user = await this.userModel.findByIdAndUpdate(id, { name: dto.name }, { new: true }).exec();
    if (!user) throw new BadRequestException('用户不存在');
    return toPublicUser(user);
  }

  async updatePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    this.logger.log(`Updating password for user: ${id}`);
    const user = await this.userModel.findById(id).select('+password').exec();
    if (!user) throw new BadRequestException('用户不存在');
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('旧密码不正确');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<PublicUser> {
    this.logger.log(`Updating avatar for user: ${id}`);
    const user = await this.userModel.findByIdAndUpdate(id, { avatar: avatarUrl }, { new: true }).exec();
    if (!user) throw new BadRequestException('用户不存在');
    return toPublicUser(user);
  }

  async addExp(
    userId: string,
    expAmount: number,
    extraBadges: Array<{ id: string; name: string }> = [],
  ): Promise<{ newExp: number; newLevel: number; leveledUp: boolean; newBadges: Array<{ id: string; name: string }> }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new BadRequestException('用户不存在');

    const oldLevel = user.level ?? 1;
    const newExp = (user.exp ?? 0) + expAmount;
    const newTotalCompleted = (user.totalCompletedNodes ?? 0) + 1;
    const newLevel = calcLevel(newExp);
    const leveledUp = newLevel > oldLevel;

    const existingBadges = new Set(user.badges ?? []);
    const earnedMilestones = MILESTONE_BADGES
      .filter((badge) => !existingBadges.has(badge.id) && badge.check(newTotalCompleted, newLevel))
      .map((badge) => ({ id: badge.id, name: badge.name }));

    const allNewBadges = [...earnedMilestones, ...extraBadges.filter((badge) => !existingBadges.has(badge.id))];
    const newBadgeIds = allNewBadges.map((badge) => badge.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    if (last) last.setHours(0, 0, 0, 0);
    const diffDays = last ? Math.round((today.getTime() - last.getTime()) / 86400000) : null;
    const streakDays = diffDays === 1 ? (user.streakDays ?? 0) + 1 : diffDays === 0 ? (user.streakDays ?? 1) : 1;

    await this.userModel.findByIdAndUpdate(userId, {
      exp: newExp,
      level: newLevel,
      totalCompletedNodes: newTotalCompleted,
      streakDays,
      lastActiveDate: today,
      $push: { badges: { $each: newBadgeIds } },
    }).exec();

    this.logger.log(`User ${userId} gained ${expAmount} EXP (total: ${newExp}, level: ${newLevel})`);
    return { newExp, newLevel, leveledUp, newBadges: allNewBadges };
  }

  async getUserStats(userId: string, treeCount: number): Promise<{
    totalExp: number;
    level: number;
    levelName: string;
    completedNodeCount: number;
    treeCount: number;
    streakDays: number;
    nextLevelExp: number;
    badges: string[];
  }> {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) throw new BadRequestException('用户不存在');
    const level = user.level ?? 1;
    const nextLevelExp = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    return {
      totalExp: user.exp ?? 0,
      level,
      levelName: LEVEL_NAMES[level] ?? '专家',
      completedNodeCount: user.totalCompletedNodes ?? 0,
      treeCount,
      streakDays: user.streakDays ?? 0,
      nextLevelExp,
      badges: user.badges ?? [],
    };
  }
}

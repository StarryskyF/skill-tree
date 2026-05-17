import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  oldPassword: string;

  @IsString()
  @MinLength(6)
  @MaxLength(16)
  newPassword: string;
}

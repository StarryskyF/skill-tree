import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  newPassword: string;
}

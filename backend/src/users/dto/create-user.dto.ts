import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(32) username: string;
  @IsString() @IsNotEmpty() @MinLength(6) @MaxLength(128) password: string;
  @IsString() @IsNotEmpty() @MaxLength(30) name: string;
}

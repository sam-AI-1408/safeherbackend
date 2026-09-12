import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role, SensitivityLevel } from '../enums';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const SENSITIVITY_KEY = 'sensitivity';
export const AllowedSensitivity = (...levels: SensitivityLevel[]) => SetMetadata(SENSITIVITY_KEY, levels);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

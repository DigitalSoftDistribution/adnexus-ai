import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { User } from '../../../domain/entities/User';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

interface ImpersonateUserInput {
  userRole: string;
  targetUserId: string;
}

export class ImpersonateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: ImpersonateUserInput): Promise<Result<User>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const user = await this.userRepository.findById(input.targetUserId);

    if (!user) {
      return err(new NotFoundError('User'));
    }

    return ok(user);
  }
}

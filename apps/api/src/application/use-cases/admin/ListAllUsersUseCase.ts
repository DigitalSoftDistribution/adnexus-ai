import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { User } from '../../../domain/entities/User';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError } from '../../../domain/value-objects/Result';

interface ListAllUsersInput {
  userRole: string;
  page?: number;
  limit?: number;
  search?: string;
  workspaceId?: string;
}

interface UserListResult {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export class ListAllUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: ListAllUsersInput): Promise<Result<UserListResult>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const result = await this.userRepository.list({
      page: input.page,
      limit: input.limit,
      search: input.search,
      workspaceId: input.workspaceId,
    });

    return ok(result);
  }
}

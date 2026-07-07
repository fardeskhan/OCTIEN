export class PermissionResolver {
  public async resolve(roles: any[]): Promise<any[]> {
    // Flatten permissions from all assigned roles, resolving hierarchies
    return roles.flatMap(role => role.permissions);
  }
}

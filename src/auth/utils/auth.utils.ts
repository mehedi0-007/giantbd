export function AuthenticatedUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          status: user.role.status,
        }
      : null,
    permissions:
      user.role?.rolePermissions?.map(
        (rp: any) => rp.permission?.name ?? rp.permissionName,
      ) ?? [],
  };
}

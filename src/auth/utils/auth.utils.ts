export function AuthenticatedUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    role: {
      id: user.role.id,
      name: user.role.name,
    },
    permissions: user.permission.map(({ per }: any) => per.name),
  };
}

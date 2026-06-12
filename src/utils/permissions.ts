export const PERMISSION = {
  SUPER_USER: 0x01,
  ADMIN: 0x02,
  CABANG: 0x04,
} as const;

export const enumeratePermission = (perm: number) => {
  return Object.entries(PERMISSION).reduce((a, [name, i]) => {
    return (perm & i) > 0 ? a.concat(name) : a;
  }, [] as string[]);
};

export const hasPermission = (
  perm: number,
  ...args: (keyof typeof PERMISSION)[]
) => {
  if ((perm & PERMISSION.SUPER_USER) > 0) return true;
  return args.reduce((a, b) => {
    return a && (perm & PERMISSION[b]) > 0;
  }, true);
};

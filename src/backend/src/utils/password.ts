import bcrypt from "bcryptjs";

// 12 rounds is a reasonable modern floor for bcrypt — expensive enough to
// meaningfully slow offline cracking of a leaked hash, cheap enough not to
// noticeably affect login latency.
const SALT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

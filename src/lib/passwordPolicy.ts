export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Parol kamida ${MIN_PASSWORD_LENGTH} belgi bo'lishi kerak`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'Parol juda uzun';
  }
  return null;
}

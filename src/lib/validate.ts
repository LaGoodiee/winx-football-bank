export type Errors<T> = Partial<Record<keyof T, string>>;

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// Nigerian numbers: +234XXXXXXXXXX or 0XXXXXXXXXX (spaces allowed)
export const isNgPhone = (s: string) => /^(\+234|0)[789][01]\d{8}$/.test(s.replace(/[\s-]/g, ''));

export const required = (s: string) => s.trim().length > 0;

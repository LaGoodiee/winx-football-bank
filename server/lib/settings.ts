import { DEFAULT_SETTINGS, type Settings } from '../../shared/domain';

export async function getSettings(db: D1Database): Promise<Settings> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'rules'").first<{ value: string }>();
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(db: D1Database, s: Settings, userId: string) {
  await db
    .prepare(
      "INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('rules', ?1, ?2, ?3) " +
        'ON CONFLICT(key) DO UPDATE SET value = ?1, updated_by = ?2, updated_at = ?3',
    )
    .bind(JSON.stringify(s), userId, Date.now())
    .run();
}

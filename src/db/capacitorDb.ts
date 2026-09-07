/**
 * قاعدة بيانات حقيقية لنسخة الهاتف — عبر Capacitor SQLite
 * ===========================================================
 * تُستخدم فقط عند تشغيل التطبيق كتطبيق أندرويد حقيقي. القرار التصميمي
 * المتعمَّد: بدل إعادة بناء نفس البنية العلائقية المعقّدة لقاعدة بيانات سطح
 * المكتب (15 جدولاً مترابطاً)، نخزّن البيانات كاملة كـ"صف واحد" في جدول
 * SQLite واحد بسيط يحتوي نص JSON — لأن كل منطق الفلترة والحسابات في التطبيق
 * يتم بالفعل داخل JavaScript، فلا حاجة فعلية لتطبيع العلائقي على الهاتف.
 */
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'agriplus';
let sqliteConn: SQLiteConnection | null = null;
let dbConn: SQLiteDBConnection | null = null;

export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function getConnection(): Promise<SQLiteDBConnection> {
  if (dbConn) return dbConn;

  if (!sqliteConn) sqliteConn = new SQLiteConnection(CapacitorSQLite);

  const consistency = (await sqliteConn.checkConnectionsConsistency()).result;
  const alreadyOpen = (await sqliteConn.isConnection(DB_NAME, false)).result;

  if (alreadyOpen && consistency) {
    dbConn = await sqliteConn.retrieveConnection(DB_NAME, false);
  } else {
    dbConn = await sqliteConn.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  await dbConn.open();
  await dbConn.execute(`
    CREATE TABLE IF NOT EXISTS app_data (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json_blob TEXT NOT NULL,
      updated_at TEXT
    );
  `);
  return dbConn;
}

export async function loadFromCapacitor(): Promise<string | null> {
  const conn = await getConnection();
  const res = await conn.query('SELECT json_blob FROM app_data WHERE id = 1;');
  if (res.values && res.values.length > 0 && res.values[0].json_blob) {
    return res.values[0].json_blob as string;
  }
  return null;
}

export async function saveToCapacitor(jsonStr: string): Promise<void> {
  const conn = await getConnection();
  await conn.run(
    `INSERT INTO app_data (id, json_blob, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json_blob = excluded.json_blob, updated_at = excluded.updated_at;`,
    [jsonStr, new Date().toISOString()]
  );
}

import mysql from 'mysql2/promise';

const DEFAULT_CONFIG = Object.freeze({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'rigth_4_live'
});

export class MySqlProfileStore {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.pool = null;
    this.initError = null;
    this.ready = this.connect().catch((error) => {
      this.initError = error;
    });
  }

  async connect() {
    this.pool = mysql.createPool({
      ...this.config,
      waitForConnections: true,
      connectionLimit: 4,
      namedPlaceholders: true
    });

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS game_profiles (
        id CHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(160) NOT NULL UNIQUE,
        birth_date DATE NOT NULL,
        gender VARCHAR(16) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        character_name VARCHAR(40) NOT NULL,
        callsign VARCHAR(40) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async upsertProfile(profile, source = {}) {
    await this.ready;
    if (this.initError) {
      throw new Error(`MySQL profile store unavailable: ${this.initError.message}`);
    }

    const now = toMysqlDateTime(new Date());

    await this.pool.execute(`
      INSERT INTO game_profiles (
        id, email, birth_date, gender, full_name, character_name, callsign, created_at, updated_at
      ) VALUES (
        :id, :email, :birthDate, :gender, :fullName, :characterName, :callsign, :createdAt, :updatedAt
      )
      ON DUPLICATE KEY UPDATE
        birth_date = VALUES(birth_date),
        gender = VALUES(gender),
        full_name = VALUES(full_name),
        character_name = VALUES(character_name),
        callsign = VALUES(callsign),
        updated_at = VALUES(updated_at)
    `, {
      id: profile.id,
      email: source.email,
      birthDate: source.birthDate,
      gender: source.gender,
      fullName: source.fullName,
      characterName: source.characterName,
      callsign: source.callsign || null,
      createdAt: now,
      updatedAt: now
    });
  }

  async close() {
    await this.pool?.end();
  }
}

export function createMySqlProfileStore() {
  if (process.env.DB_DISABLED === '1') {
    return null;
  }

  return new MySqlProfileStore();
}

function toMysqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

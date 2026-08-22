const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHARACTER_RE = /^[a-zA-Z0-9 _.-]{2,24}$/;
const GENDERS = new Set(['male', 'female', 'other']);

export function validateProfile(input) {
  const email = String(input?.email ?? '').trim().toLowerCase();
  const birthDate = String(input?.birthDate ?? input?.birth_date ?? '').trim();
  const gender = String(input?.gender ?? '').trim().toLowerCase();
  const fullName = String(input?.fullName ?? input?.full_name ?? '').trim();
  const characterName = String(input?.characterName ?? input?.character_name ?? '').trim();
  const callsign = String(input?.callsign ?? '').trim();

  if (!EMAIL_RE.test(email)) {
    throw httpError(400, 'Invalid email');
  }

  if (!DATE_RE.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00Z`))) {
    throw httpError(400, 'Invalid birth date');
  }

  if (!GENDERS.has(gender)) {
    throw httpError(400, 'Invalid gender');
  }

  if (fullName.length < 3 || fullName.length > 80) {
    throw httpError(400, 'Invalid full name');
  }

  if (!CHARACTER_RE.test(characterName)) {
    throw httpError(400, 'Invalid character name');
  }

  return { email, birthDate, gender, fullName, characterName, callsign: callsign.slice(0, 40) };
}

export function validateSavePayload(payload) {
  if (!payload || payload.version !== 1) {
    throw httpError(400, 'Unsupported save version');
  }

  const inventory = payload.inventory ?? {};
  const allowedInventory = ['wood', 'stone', 'artifact', 'ammoReserve', 'healingPotion', 'experience'];
  const sanitizedInventory = Object.fromEntries(
    allowedInventory.map((key) => [key, sanitizeCount(inventory[key])])
  );

  return {
    version: 1,
    inventory: sanitizedInventory,
    magazine: sanitizeCount(payload.magazine, 6),
    towers: Array.isArray(payload.towers) ? payload.towers.slice(0, 24) : [],
    activeCheckpointId: typeof payload.activeCheckpointId === 'string' ? payload.activeCheckpointId : null,
    storyStep: sanitizeCount(payload.storyStep, 100),
    player: sanitizePlayer(payload.player)
  };
}

export function validateChatMessage(input) {
  const message = String(input?.message ?? '').trim().replace(/\s+/g, ' ');

  if (message.length < 1 || message.length > 120) {
    throw httpError(400, 'Invalid chat message');
  }

  return message;
}

export function validateGravestone(input) {
  const sessionId = String(input?.sessionId ?? input?.session_id ?? '').trim() || 'north-forest-01';
  const deadProfileId = String(input?.deadProfileId ?? input?.dead_profile_id ?? '').trim();
  const deadCharacterName = String(input?.deadCharacterName ?? input?.dead_character_name ?? '').trim();
  const x = Number(input?.x);
  const z = Number(input?.z);

  if (!deadProfileId || !deadCharacterName || !Number.isFinite(x) || !Number.isFinite(z)) {
    throw httpError(400, 'Invalid gravestone');
  }

  return { sessionId, deadProfileId, deadCharacterName, x, z };
}

export function validateGravestoneMessage(input) {
  const message = String(input?.message ?? '').trim().replace(/\s+/g, ' ');

  if (message.length > 160) {
    throw httpError(400, 'Invalid gravestone message');
  }

  return message || null;
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sanitizePlayer(player) {
  const x = Number(player?.x);
  const z = Number(player?.z);
  const facing = Number(player?.facing);

  return {
    x: Number.isFinite(x) ? x : 0,
    z: Number.isFinite(z) ? z : 0,
    facing: Number.isFinite(facing) ? facing : 0
  };
}

function sanitizeCount(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
}

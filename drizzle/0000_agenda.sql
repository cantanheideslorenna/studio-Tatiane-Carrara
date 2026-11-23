CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE appointments (
 id TEXT PRIMARY KEY,
 date TEXT NOT NULL,
 start INTEGER NOT NULL CHECK(start >= 540 AND start < 1080),
 end INTEGER NOT NULL CHECK(end > start AND end <= 1080),
 kind TEXT NOT NULL CHECK(kind IN ('appointment','block')),
 service_id TEXT,
 service_name TEXT NOT NULL,
 price INTEGER NOT NULL DEFAULT 0 CHECK(price >= 0),
 client_name TEXT NOT NULL DEFAULT '',
 client_phone TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX appointments_date ON appointments(date, status);
--> statement-breakpoint
CREATE TRIGGER prevent_overlap_insert BEFORE INSERT ON appointments
WHEN NEW.status = 'confirmed' AND EXISTS (SELECT 1 FROM appointments WHERE date = NEW.date AND status = 'confirmed' AND start < NEW.end AND end > NEW.start)
BEGIN SELECT RAISE(ABORT, 'SLOT_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER prevent_overlap_update BEFORE UPDATE ON appointments
WHEN NEW.status = 'confirmed' AND EXISTS (SELECT 1 FROM appointments WHERE id != NEW.id AND date = NEW.date AND status = 'confirmed' AND start < NEW.end AND end > NEW.start)
BEGIN SELECT RAISE(ABORT, 'SLOT_CONFLICT'); END;

ALTER TABLE appointments ADD COLUMN services_json TEXT;
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN quote_id TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX appointments_quote ON appointments(quote_id);
--> statement-breakpoint
CREATE TABLE quotes (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL,
 date TEXT NOT NULL,
 start INTEGER NOT NULL CHECK(start >= 540 AND start < 1080),
 client_name TEXT NOT NULL,
 client_phone TEXT NOT NULL,
 services_json TEXT NOT NULL,
 duration INTEGER NOT NULL CHECK(duration > 0 AND duration <= 540),
 price INTEGER NOT NULL CHECK(price >= 0),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','partial','rejected')),
 decision_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 decided_at TEXT
);
--> statement-breakpoint
CREATE INDEX quotes_status_date ON quotes(status,date,start);

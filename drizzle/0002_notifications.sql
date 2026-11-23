ALTER TABLE quotes ADD COLUMN whatsapp_consent INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE quotes ADD COLUMN consent_at TEXT;
--> statement-breakpoint
ALTER TABLE quotes ADD COLUMN cancelled_at TEXT;
--> statement-breakpoint
ALTER TABLE quotes ADD COLUMN cancelled_by TEXT;
--> statement-breakpoint
ALTER TABLE quotes ADD COLUMN cancellation_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN cancelled_at TEXT;
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN cancelled_by TEXT;
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE notifications (
 id TEXT PRIMARY KEY,
 quote_id TEXT,
 appointment_id TEXT,
 event TEXT NOT NULL CHECK(event IN ('approval','cancellation')),
 phone TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','awaiting_config','sending','accepted','failed','unknown','skipped_no_consent','superseded')),
 attempts INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT,
 error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX notifications_status ON notifications(status,created_at);

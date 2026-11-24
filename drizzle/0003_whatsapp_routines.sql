ALTER TABLE appointments ADD COLUMN whatsapp_consent_at TEXT;
--> statement-breakpoint
CREATE TABLE notifications_next (
 id TEXT PRIMARY KEY,
 quote_id TEXT,
 appointment_id TEXT,
 event TEXT NOT NULL CHECK(event IN ('approval','cancellation','manual_confirmation','reminder')),
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
INSERT INTO notifications_next SELECT * FROM notifications;
--> statement-breakpoint
DROP TABLE notifications;
--> statement-breakpoint
ALTER TABLE notifications_next RENAME TO notifications;
--> statement-breakpoint
CREATE INDEX notifications_status ON notifications(status,created_at);

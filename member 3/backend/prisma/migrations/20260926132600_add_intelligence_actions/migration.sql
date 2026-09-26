CREATE TABLE IF NOT EXISTS "intelligence_actions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "product_id" TEXT,
    "warehouse_id" TEXT,
    "location_id" TEXT,
    "reference_id" TEXT,
    "recommended_action" TEXT,
    "condition_fingerprint" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "intelligence_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "intelligence_actions_dedupe_key_key" ON "intelligence_actions"("dedupe_key");
CREATE INDEX IF NOT EXISTS "intelligence_actions_status_priority_created_at_idx" ON "intelligence_actions"("status", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "intelligence_actions_product_id_warehouse_id_idx" ON "intelligence_actions"("product_id", "warehouse_id");

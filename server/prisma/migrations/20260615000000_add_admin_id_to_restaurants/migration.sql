-- Step 1: Add admin_id column as NULLABLE with FK constraint
ALTER TABLE "restaurants" ADD COLUMN "admin_id" TEXT;

ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 2: Fail if no admin exists (prevents orphaned restaurants)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "admins") THEN
    RAISE EXCEPTION 'No admin record exists. Cannot assign restaurant ownership.';
  END IF;
END $$;

-- Step 3: Backfill all existing restaurants with the first admin's ID
UPDATE "restaurants" SET "admin_id" = (SELECT "id" FROM "admins" ORDER BY "created_at" ASC LIMIT 1);

-- Step 4: Alter column to NOT NULL
ALTER TABLE "restaurants" ALTER COLUMN "admin_id" SET NOT NULL;

-- Remove password/OTP auth artifacts that are no longer part of schema.prisma.
-- They were added by 20261018140857_password_otp_auth, but no application code
-- reads or writes them. IF EXISTS keeps the migration safe on databases that
-- never applied the original migration.
DROP TABLE IF EXISTS "OtpChallenge";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";

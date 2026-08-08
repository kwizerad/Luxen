-- Migration: Create exam_request_payments table for Request Code service
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS exam_request_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_type TEXT CHECK (exam_type IN ('theory', 'practical')),
    national_id TEXT NOT NULL,
    amount NUMERIC(10,2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    irembo_verified BOOLEAN DEFAULT false,
    irembo_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_request_payments_user_id ON exam_request_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_request_payments_exam_type ON exam_request_payments(exam_type);
CREATE INDEX IF NOT EXISTS idx_exam_request_payments_payment_status ON exam_request_payments(payment_status);

ALTER TABLE exam_request_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON exam_request_payments;
DROP POLICY IF EXISTS "Users can create own payments" ON exam_request_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON exam_request_payments;

CREATE POLICY "Users can view own payments"
  ON exam_request_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own payments"
  ON exam_request_payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all payments"
  ON exam_request_payments FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

COMMENT ON TABLE exam_request_payments IS 'Payment records for exam request code service (theory & practical)';

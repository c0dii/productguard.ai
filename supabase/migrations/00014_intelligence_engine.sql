-- Migration: Intelligence Engine - Learning from User Feedback
-- Description: Collect training data from user verifications to improve search and AI
-- Created: 2026-02-16

-- Create table to track learning patterns
CREATE TABLE IF NOT EXISTS intelligence_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Pattern type
  pattern_type TEXT NOT NULL, -- 'verified_keyword', 'false_positive_keyword', 'verified_domain', 'verified_phrase', etc.
  pattern_value TEXT NOT NULL,

  -- Context
  platform TEXT,
  product_type TEXT, -- e.g., 'indicator', 'plugin', 'course'

  -- Learning metrics
  occurrences INTEGER DEFAULT 1, -- How many times we've seen this pattern
  verified_count INTEGER DEFAULT 0, -- Times associated with verified infringements
  rejected_count INTEGER DEFAULT 0, -- Times associated with false positives
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0-1 score (verified / total)

  -- Metadata
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_intelligence_patterns_product ON intelligence_patterns(product_id);
CREATE INDEX idx_intelligence_patterns_type ON intelligence_patterns(pattern_type);
CREATE INDEX idx_intelligence_patterns_confidence ON intelligence_patterns(confidence_score DESC);

-- Create unique constraint to prevent duplicate patterns
CREATE UNIQUE INDEX idx_intelligence_patterns_unique
ON intelligence_patterns(product_id, pattern_type, pattern_value, platform);

-- RLS policies
ALTER TABLE intelligence_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view patterns for their products"
ON intelligence_patterns FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert patterns"
ON intelligence_patterns FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create table to track AI model performance over time
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Time period
  date DATE NOT NULL,

  -- Detection metrics
  total_detections INTEGER DEFAULT 0,
  verified_infringements INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  pending_verifications INTEGER DEFAULT 0,

  -- Accuracy metrics
  precision_rate DECIMAL(5,4), -- verified / (verified + false_positives)
  recall_estimate DECIMAL(5,4), -- Estimated (hard to measure)

  -- AI filtering metrics
  ai_filter_applied BOOLEAN DEFAULT false,
  ai_pass_rate DECIMAL(5,4), -- % of results that passed AI filter
  ai_confidence_threshold DECIMAL(3,2),

  -- Search optimization metrics
  avg_severity_score DECIMAL(5,2),
  avg_match_confidence DECIMAL(3,2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_metrics_per_product_date UNIQUE (product_id, date)
);

-- Create indexes
CREATE INDEX idx_ai_metrics_date ON ai_performance_metrics(date DESC);
CREATE INDEX idx_ai_metrics_product ON ai_performance_metrics(product_id);

-- RLS policies
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their AI metrics"
ON ai_performance_metrics FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create table for optimized search queries (learned over time)
CREATE TABLE IF NOT EXISTS optimized_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,

  -- Query optimization
  base_query TEXT NOT NULL, -- Original query
  optimized_query TEXT NOT NULL, -- AI-optimized query
  optimization_reason TEXT, -- Why this query works better

  -- Performance
  success_rate DECIMAL(5,4), -- % of results that were verified
  avg_severity DECIMAL(5,2),
  total_uses INTEGER DEFAULT 0,
  verified_finds INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX idx_optimized_queries_product ON optimized_queries(product_id);
CREATE INDEX idx_optimized_queries_platform ON optimized_queries(platform);
CREATE INDEX idx_optimized_queries_success ON optimized_queries(success_rate DESC);

-- Create function to update pattern from user feedback
CREATE OR REPLACE FUNCTION learn_from_user_feedback(
  p_infringement_id UUID,
  p_action TEXT -- 'verify' or 'reject'
)
RETURNS void AS $$
DECLARE
  v_infringement RECORD;
  v_pattern_value TEXT;
BEGIN
  -- Get infringement details
  SELECT * INTO v_infringement
  FROM infringements
  WHERE id = p_infringement_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Extract and learn from matched keywords
  IF v_infringement.evidence IS NOT NULL AND v_infringement.evidence->'matched_excerpts' IS NOT NULL THEN
    FOR v_pattern_value IN
      SELECT jsonb_array_elements_text(v_infringement.evidence->'matched_excerpts')
    LOOP
      -- Upsert pattern
      INSERT INTO intelligence_patterns (
        product_id,
        user_id,
        pattern_type,
        pattern_value,
        platform,
        occurrences,
        verified_count,
        rejected_count
      ) VALUES (
        v_infringement.product_id,
        v_infringement.user_id,
        CASE WHEN p_action = 'verify' THEN 'verified_keyword' ELSE 'false_positive_keyword' END,
        v_pattern_value,
        v_infringement.platform,
        1,
        CASE WHEN p_action = 'verify' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'reject' THEN 1 ELSE 0 END
      )
      ON CONFLICT (product_id, pattern_type, pattern_value, platform)
      DO UPDATE SET
        occurrences = intelligence_patterns.occurrences + 1,
        verified_count = intelligence_patterns.verified_count + CASE WHEN p_action = 'verify' THEN 1 ELSE 0 END,
        rejected_count = intelligence_patterns.rejected_count + CASE WHEN p_action = 'reject' THEN 1 ELSE 0 END,
        last_seen_at = NOW(),
        confidence_score = (
          (intelligence_patterns.verified_count + CASE WHEN p_action = 'verify' THEN 1 ELSE 0 END)::DECIMAL /
          NULLIF(intelligence_patterns.occurrences + 1, 0)
        );
    END LOOP;
  END IF;

  -- Learn from domain patterns
  INSERT INTO intelligence_patterns (
    product_id,
    user_id,
    pattern_type,
    pattern_value,
    platform,
    occurrences,
    verified_count,
    rejected_count
  ) VALUES (
    v_infringement.product_id,
    v_infringement.user_id,
    CASE WHEN p_action = 'verify' THEN 'verified_domain' ELSE 'false_positive_domain' END,
    v_infringement.url_normalized,
    v_infringement.platform,
    1,
    CASE WHEN p_action = 'verify' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'reject' THEN 1 ELSE 0 END
  )
  ON CONFLICT (product_id, pattern_type, pattern_value, platform)
  DO UPDATE SET
    occurrences = intelligence_patterns.occurrences + 1,
    verified_count = intelligence_patterns.verified_count + CASE WHEN p_action = 'verify' THEN 1 ELSE 0 END,
    rejected_count = intelligence_patterns.rejected_count + CASE WHEN p_action = 'reject' THEN 1 ELSE 0 END,
    last_seen_at = NOW(),
    confidence_score = (
      (intelligence_patterns.verified_count + CASE WHEN p_action = 'verify' THEN 1 ELSE 0 END)::DECIMAL /
      NULLIF(intelligence_patterns.occurrences + 1, 0)
    );

END;
$$ LANGUAGE plpgsql;

-- Create function to get top patterns for a product
CREATE OR REPLACE FUNCTION get_top_patterns(
  p_product_id UUID,
  p_pattern_type TEXT DEFAULT 'verified_keyword',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  pattern_value TEXT,
  confidence_score DECIMAL,
  occurrences INTEGER,
  verified_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.pattern_value,
    ip.confidence_score,
    ip.occurrences,
    ip.verified_count
  FROM intelligence_patterns ip
  WHERE ip.product_id = p_product_id
    AND ip.pattern_type = p_pattern_type
    AND ip.confidence_score > 0.5 -- Only patterns with >50% verification rate
  ORDER BY ip.confidence_score DESC, ip.occurrences DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON TABLE intelligence_patterns IS 'Learning patterns from user feedback to improve search and AI over time';
COMMENT ON TABLE ai_performance_metrics IS 'Track AI model accuracy and performance metrics over time';
COMMENT ON TABLE optimized_queries IS 'AI-optimized search queries that perform better based on learned patterns';
COMMENT ON FUNCTION learn_from_user_feedback IS 'Extract and store learning patterns when user verifies or rejects infringement';

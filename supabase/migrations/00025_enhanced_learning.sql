-- Enhanced Intelligence Engine Learning
-- Teaches the system from platform, hosting, country, match type, and URL path patterns

CREATE OR REPLACE FUNCTION learn_from_user_feedback(
  p_infringement_id UUID,
  p_action TEXT -- 'verify' or 'reject'
)
RETURNS void AS $$
DECLARE
  v_inf RECORD;
  v_pattern_value TEXT;
  v_hosting TEXT;
  v_country TEXT;
  v_prefix TEXT;
BEGIN
  -- Get full infringement details
  SELECT * INTO v_inf
  FROM infringements
  WHERE id = p_infringement_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine pattern prefix based on action
  v_prefix := CASE WHEN p_action = 'verify' THEN 'verified' ELSE 'false_positive' END;

  -- ─── 1. KEYWORD PATTERNS (from matched excerpts) ───
  IF v_inf.evidence IS NOT NULL AND v_inf.evidence->'matched_excerpts' IS NOT NULL THEN
    FOR v_pattern_value IN
      SELECT jsonb_array_elements_text(v_inf.evidence->'matched_excerpts')
    LOOP
      INSERT INTO intelligence_patterns (
        product_id, user_id, pattern_type, pattern_value, platform,
        occurrences, verified_count, rejected_count
      ) VALUES (
        v_inf.product_id, v_inf.user_id,
        v_prefix || '_keyword', v_pattern_value, v_inf.platform,
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

  -- ─── 2. DOMAIN PATTERNS ───
  IF v_inf.url_normalized IS NOT NULL THEN
    INSERT INTO intelligence_patterns (
      product_id, user_id, pattern_type, pattern_value, platform,
      occurrences, verified_count, rejected_count
    ) VALUES (
      v_inf.product_id, v_inf.user_id,
      v_prefix || '_domain', v_inf.url_normalized, v_inf.platform,
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
  END IF;

  -- ─── 3. PLATFORM PATTERNS ───
  -- Tracks which scanner platforms (google, telegram, etc.) produce real vs false infringements
  IF v_inf.platform IS NOT NULL THEN
    INSERT INTO intelligence_patterns (
      product_id, user_id, pattern_type, pattern_value, platform,
      occurrences, verified_count, rejected_count
    ) VALUES (
      v_inf.product_id, v_inf.user_id,
      v_prefix || '_platform', v_inf.platform, v_inf.platform,
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
  END IF;

  -- ─── 4. HOSTING PROVIDER PATTERNS ───
  v_hosting := v_inf.infrastructure->>'hosting_provider';
  IF v_hosting IS NOT NULL AND v_hosting != '' THEN
    INSERT INTO intelligence_patterns (
      product_id, user_id, pattern_type, pattern_value, platform,
      occurrences, verified_count, rejected_count
    ) VALUES (
      v_inf.product_id, v_inf.user_id,
      v_prefix || '_hosting', v_hosting, v_inf.platform,
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
  END IF;

  -- ─── 5. COUNTRY PATTERNS ───
  v_country := v_inf.infrastructure->>'country';
  IF v_country IS NOT NULL AND v_country != '' THEN
    INSERT INTO intelligence_patterns (
      product_id, user_id, pattern_type, pattern_value, platform,
      occurrences, verified_count, rejected_count
    ) VALUES (
      v_inf.product_id, v_inf.user_id,
      v_prefix || '_country', v_country, v_inf.platform,
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
  END IF;

  -- ─── 6. MATCH TYPE PATTERNS ───
  -- Tracks which detection methods (exact_hash, keyword, phrase, etc.) are most reliable
  IF v_inf.match_type IS NOT NULL THEN
    INSERT INTO intelligence_patterns (
      product_id, user_id, pattern_type, pattern_value, platform,
      occurrences, verified_count, rejected_count
    ) VALUES (
      v_inf.product_id, v_inf.user_id,
      v_prefix || '_match_type', v_inf.match_type::TEXT, v_inf.platform,
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
  END IF;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION learn_from_user_feedback IS 'Enhanced: learns keywords, domains, platforms, hosting providers, countries, and match types from user verification feedback';

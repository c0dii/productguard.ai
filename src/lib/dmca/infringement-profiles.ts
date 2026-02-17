/**
 * Infringement Profile System
 *
 * Maps detected infringements to legally precise profiles with specific
 * §106 rights violations. Each profile generates the correct legal framing
 * for the DMCA notice body.
 */

export type InfringementProfile =
  | 'full_reupload'
  | 'copied_text'
  | 'copied_images'
  | 'leaked_download'
  | 'unauthorized_resale'
  | 'partial_copy';

export interface ProfileInfo {
  id: InfringementProfile;
  label: string;
  legalBasis: string;
  description: string;
}

const PROFILES: Record<InfringementProfile, ProfileInfo> = {
  full_reupload: {
    id: 'full_reupload',
    label: 'Full Reupload / Mirror',
    legalBasis:
      'reproduction, distribution, and public display of the copyrighted work in its entirety, in violation of 17 U.S.C. §106(1), §106(3), and §106(5)',
    description:
      'The infringing material is a complete or substantially complete copy of the copyrighted work, reproduced and made available without authorization.',
  },
  copied_text: {
    id: 'copied_text',
    label: 'Copied Text / Content Scrape',
    legalBasis:
      'reproduction and public display of substantial textual content from the copyrighted work, in violation of 17 U.S.C. §106(1) and §106(5)',
    description:
      'The infringing material contains substantial portions of text, descriptions, or written content copied directly from the copyrighted work.',
  },
  copied_images: {
    id: 'copied_images',
    label: 'Copied Images / Visual Assets',
    legalBasis:
      'reproduction and public display of copyrighted visual assets, in violation of 17 U.S.C. §106(1) and §106(5)',
    description:
      'The infringing material contains copyrighted screenshots, graphics, images, or other visual assets reproduced without authorization.',
  },
  leaked_download: {
    id: 'leaked_download',
    label: 'Leaked Download / File Distribution',
    legalBasis:
      'unauthorized reproduction and distribution of copyrighted digital files, in violation of 17 U.S.C. §106(1) and §106(3)',
    description:
      'The copyrighted work has been made available for unauthorized download or distribution through file sharing, messaging platforms, or cyberlockers.',
  },
  unauthorized_resale: {
    id: 'unauthorized_resale',
    label: 'Unauthorized Resale',
    legalBasis:
      'unauthorized reproduction, distribution, and commercial exploitation of the copyrighted work, in violation of 17 U.S.C. §106(1), §106(3), and §106(5)',
    description:
      'The copyrighted work is being offered for sale or commercial distribution without any license or authorization from the copyright holder.',
  },
  partial_copy: {
    id: 'partial_copy',
    label: 'Partial Copy / Excerpt',
    legalBasis:
      'reproduction and public display of substantial portions of the copyrighted work, in violation of 17 U.S.C. §106(1) and §106(5)',
    description:
      'The infringing material contains substantial excerpts, modules, or sections copied from the copyrighted work without authorization.',
  },
};

/**
 * Platform-to-profile mapping for automatic detection
 */
const PLATFORM_PROFILE_MAP: Record<string, InfringementProfile> = {
  telegram: 'leaked_download',
  discord: 'leaked_download',
  torrent: 'leaked_download',
  cyberlocker: 'leaked_download',
  google: 'full_reupload',
  forum: 'copied_text',
  social: 'copied_text',
};

/**
 * Infringement type to profile mapping
 */
const TYPE_PROFILE_MAP: Record<string, InfringementProfile> = {
  channel: 'leaked_download',
  group: 'leaked_download',
  bot: 'leaked_download',
  indexed_page: 'full_reupload',
  direct_download: 'leaked_download',
  torrent: 'leaked_download',
  server: 'leaked_download',
  post: 'copied_text',
};

/**
 * Auto-detect infringement profile from scan data.
 * Uses platform, infringement type, and evidence to determine the best profile.
 */
export function detectInfringementProfile(infringement: {
  platform?: string;
  infringement_type?: string;
  evidence?: any;
  source_url?: string;
}): InfringementProfile {
  // 1. Check infringement type first (most specific)
  if (infringement.infringement_type) {
    const typeProfile = TYPE_PROFILE_MAP[infringement.infringement_type];
    if (typeProfile) return typeProfile;
  }

  // 2. Check evidence for clues
  if (infringement.evidence) {
    const evidence = infringement.evidence;

    // If evidence has price/purchase info, likely unauthorized resale
    if (evidence.has_price || evidence.is_marketplace) {
      return 'unauthorized_resale';
    }

    // If evidence mostly has image matches
    if (evidence.image_matches && evidence.image_matches.length > 0 &&
        (!evidence.matched_excerpts || evidence.matched_excerpts.length === 0)) {
      return 'copied_images';
    }
  }

  // 3. Check URL patterns
  if (infringement.source_url) {
    const url = infringement.source_url.toLowerCase();
    if (url.includes('mega.nz') || url.includes('mediafire') || url.includes('drive.google') ||
        url.includes('dropbox') || url.includes('anonfiles') || url.includes('gofile')) {
      return 'leaked_download';
    }
    if (url.includes('gumroad') || url.includes('shopify') || url.includes('etsy') ||
        url.includes('sellfy') || url.includes('payhip')) {
      return 'unauthorized_resale';
    }
  }

  // 4. Fall back to platform mapping
  if (infringement.platform) {
    const platformProfile = PLATFORM_PROFILE_MAP[infringement.platform.toLowerCase()];
    if (platformProfile) return platformProfile;
  }

  // Default to full_reupload as the broadest claim
  return 'full_reupload';
}

/**
 * Get full profile info for a detected profile
 */
export function getProfileInfo(profile: InfringementProfile): ProfileInfo {
  return PROFILES[profile];
}

/**
 * Get all available profiles (for manual override in UI)
 */
export function getAllProfiles(): ProfileInfo[] {
  return Object.values(PROFILES);
}

export const INFRINGEMENT_TYPES = [
  {
    value: 'exact_recreation',
    label: 'Exact Recreation/Clone',
    description: 'Someone has recreated your product with identical or nearly identical functionality',
    severity: 'high',
  },
  {
    value: 'name_trademark',
    label: 'Name/Trademark Infringement',
    description: 'Using your product name, brand, or trademark without authorization',
    severity: 'high',
  },
  {
    value: 'unauthorized_distribution',
    label: 'Unauthorized Distribution',
    description: 'Distributing your product (free or paid) without permission',
    severity: 'high',
  },
  {
    value: 'piracy_sale',
    label: 'Piracy/Unauthorized Sale',
    description: 'Selling unauthorized copies of your product',
    severity: 'critical',
  },
  {
    value: 'copyright_infringement',
    label: 'Copyright Infringement',
    description: 'Using your copyrighted code, documentation, or materials',
    severity: 'high',
  },
  {
    value: 'trade_dress',
    label: 'Trade Dress Infringement',
    description: 'Copying the look, feel, or presentation of your product',
    severity: 'medium',
  },
  {
    value: 'derivative_work',
    label: 'Unauthorized Derivative Work',
    description: 'Creating modifications or extensions without permission',
    severity: 'medium',
  },
] as const;

export type InfringementTypeValue = (typeof INFRINGEMENT_TYPES)[number]['value'];

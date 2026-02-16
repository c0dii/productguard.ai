import { z } from 'zod';

// ============================================================================
// PRODUCT VALIDATION
// ============================================================================

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long'),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  price: z.number().min(0, 'Price must be positive').max(999999.99, 'Price too large'),
  type: z.enum(['course', 'indicator', 'software', 'template', 'ebook', 'other']),
  keywords: z.array(z.string()).optional(),
  description: z.string().max(1000, 'Description too long').optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ============================================================================
// SCAN REQUEST VALIDATION
// ============================================================================

export const scanRequestSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
});

export type ScanRequestInput = z.infer<typeof scanRequestSchema>;

// ============================================================================
// TAKEDOWN VALIDATION
// ============================================================================

export const takedownSchema = z.object({
  infringement_id: z.string().uuid('Invalid infringement ID'),
  type: z.enum(['dmca', 'cease_desist', 'google_deindex']),
});

export type TakedownInput = z.infer<typeof takedownSchema>;

// ============================================================================
// AUTH VALIDATION
// ============================================================================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Name is required').max(255),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

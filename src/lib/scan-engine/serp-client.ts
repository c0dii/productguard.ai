/**
 * Serper.dev Client — rate-limited, budget-tracked wrapper.
 *
 * Features:
 * - 150ms minimum delay between API calls
 * - Batch execution with concurrency of 3
 * - Hard budget cap (default 50 calls per scan)
 * - Automatic budget enforcement — queries exceeding the budget are skipped
 */

export interface SerpSearchParams {
  query: string;
  num: number; // results per query (10 or 30)
}

export interface SerpResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerpResponse {
  organic_results: SerpResult[];
  query: string;
}

export class SerpClient {
  private apiKey: string;
  private budgetUsed: number = 0;
  private budgetLimit: number;
  private lastCallTime: number = 0;
  private readonly MIN_DELAY_MS = 150;
  private readonly BATCH_CONCURRENCY = 3;

  constructor(apiKey: string, budgetLimit: number = 50) {
    this.apiKey = apiKey;
    this.budgetLimit = budgetLimit;
  }

  get remaining(): number {
    return this.budgetLimit - this.budgetUsed;
  }

  get used(): number {
    return this.budgetUsed;
  }

  get isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'xxxxx' && this.remaining > 0;
  }

  /**
   * Execute a single search with rate limiting and budget tracking.
   */
  async search(params: SerpSearchParams): Promise<SerpResponse> {
    if (this.remaining <= 0) {
      console.log('[SerpClient] Budget exhausted, skipping query');
      return { organic_results: [], query: params.query };
    }

    // Enforce minimum delay between calls
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.MIN_DELAY_MS && this.lastCallTime > 0) {
      await new Promise((r) => setTimeout(r, this.MIN_DELAY_MS - elapsed));
    }

    try {
      this.lastCallTime = Date.now();
      this.budgetUsed++;

      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: params.query, num: params.num }),
        signal: AbortSignal.timeout(15000), // 15s timeout per API call
      });

      if (!response.ok) {
        console.error(`[SerpClient] API error ${response.status} for: ${params.query}`);
        return { organic_results: [], query: params.query };
      }

      const data = await response.json();

      return {
        organic_results: (data.organic || []).map((r: any, i: number) => ({
          title: r.title || '',
          link: r.link || '',
          snippet: r.snippet || '',
          position: r.position || i + 1,
        })),
        query: params.query,
      };
    } catch (error) {
      console.error(`[SerpClient] Error for "${params.query}":`, error);
      return { organic_results: [], query: params.query };
    }
  }

  /**
   * Execute a batch of queries with concurrency control.
   * Runs up to BATCH_CONCURRENCY queries simultaneously.
   * Automatically trims to budget.
   */
  async searchBatch(queries: SerpSearchParams[]): Promise<SerpResponse[]> {
    const results: SerpResponse[] = [];

    // Only run as many queries as the budget allows
    const affordable = queries.slice(0, this.remaining);

    if (affordable.length < queries.length) {
      console.log(
        `[SerpClient] Budget limited: running ${affordable.length}/${queries.length} queries (${this.budgetUsed}/${this.budgetLimit} used)`
      );
    }

    // Process in batches of BATCH_CONCURRENCY
    for (let i = 0; i < affordable.length; i += this.BATCH_CONCURRENCY) {
      const batch = affordable.slice(i, i + this.BATCH_CONCURRENCY);
      const batchResults = await Promise.all(batch.map((q) => this.search(q)));
      results.push(...batchResults);
    }

    return results;
  }
}

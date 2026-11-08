export declare const rankings: {
  readonly CASE_SENSITIVE_EQUAL: 7;
  readonly EQUAL: 6;
  readonly STARTS_WITH: 5;
  readonly WORD_STARTS_WITH: 4;
  readonly CONTAINS: 3;
  readonly ACRONYM: 2;
  readonly MATCHES: 1;
  readonly NO_MATCH: 0;
};
/** Subsequence scores are fractional; thresholds and caps can be fractional too. */
export type Ranking = number;
export interface RankingInfo {
  rankedValue: unknown;
  rank: Ranking;
  accessorIndex: number;
  accessorThreshold: Ranking | undefined;
  passed: boolean;
}
export type AccessorFn<TItem> = (
  item: TItem,
) => string | readonly string[] | null | undefined;
export interface AccessorAttributes {
  threshold?: Ranking;
  minRanking: Ranking;
  maxRanking: Ranking;
}
export interface AccessorOptions<TItem> {
  accessor: AccessorFn<TItem>;
  threshold?: Ranking;
  minRanking?: Ranking;
  maxRanking?: Ranking;
}
export type Accessor<TItem> = AccessorFn<TItem> | AccessorOptions<TItem>;
export interface RankItemOptions<TItem = unknown> {
  accessors?: readonly Accessor<TItem>[];
  threshold?: Ranking;
  keepDiacritics?: boolean;
}
export declare function rankItem<TItem>(
  item: TItem,
  value: string,
  options?: RankItemOptions<TItem>,
): RankingInfo;
export declare function compareItems<TItem = unknown>(
  a: Pick<RankingInfo, "rank">,
  b: Pick<RankingInfo, "rank">,
): number;

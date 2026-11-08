import {
  rankItem,
  compareItems,
  rankings,
  type Ranking,
  type RankingInfo,
} from "vtanstack-match-sorter-utils";
const threshold: Ranking = 1.2;
const result: RankingInfo = rankItem(
  { name: "José", tags: ["algebra", "math"] },
  "Jose",
  {
    accessors: [
      (x) => x.name,
      { accessor: (x) => x.tags, maxRanking: rankings.CONTAINS },
      () => null,
    ],
    threshold,
  },
);
compareItems(result, { rank: 1.5 });
// @ts-expect-error query must be a string
rankItem("abc", 3);

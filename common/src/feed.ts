// User interest to user interest distance:
import { sum } from 'lodash'
export const MINIMUM_SCORE = 0.0035
export const DEFAULT_FEED_USER_ID = 'yYNDWRmBJDcWW0q1aZFi6xfKNcQ2'
export const ALL_FEED_USER_ID = 'IG3WZ8i3IzY6R4wuTDxuvsXbkxD3'

export type FEED_DATA_TYPES =
  | 'new_contract'
  | 'repost'
  | 'contract_probability_changed'
  | 'trending_contract'
  | 'new_subsidy'
  | 'high_conversion'

// TODO: add 'shared_contract'
export type CONTRACT_FEED_REASON_TYPES =
  | 'follow_contract'
  | 'liked_contract'
  | 'contract_in_group_you_are_in'
  | 'similar_interest_vector_to_contract'
  | 'follow_user'

export type FEED_REASON_TYPES =
  | CONTRACT_FEED_REASON_TYPES
  | 'similar_interest_vector_to_news_vector'

export const NEW_USER_FEED_DATA_TYPES: FEED_DATA_TYPES[] = [
  'new_contract',
  'contract_probability_changed',
  'trending_contract',
  'new_subsidy',
]

export const BASE_FEED_DATA_TYPE_SCORES: { [key in FEED_DATA_TYPES]: number } =
  {
    high_conversion: 0.35,
    new_contract: 0.25,
    repost: 0.3,
    new_subsidy: 0.1,
    contract_probability_changed: 0.25,
    trending_contract: 0.2,
  }

export const BASE_FEED_REASON_TYPE_SCORES: {
  [key in FEED_REASON_TYPES]: number
} = {
  follow_contract: 0.4,
  liked_contract: 0.2,
  contract_in_group_you_are_in: 0.3,
  similar_interest_vector_to_contract: 0, // score calculated using interest distance
  follow_user: 0.4,
  similar_interest_vector_to_news_vector: 0.1,
}

export const getRelevanceScore = (
  feedDataType: FEED_DATA_TYPES,
  reasons: FEED_REASON_TYPES[],
  importanceScore: number,
  conversionScore: number,
  interestDistance: number,
  probChange: number,
  trendingContractType?: 'old' | 'new',
  randomGroupCoefficient = 0
): number => {
  const dataTypeScore =
    trendingContractType === 'old'
      ? 0
      : BASE_FEED_DATA_TYPE_SCORES[feedDataType]

  const reasonsScore = sum(reasons.map((r) => BASE_FEED_REASON_TYPE_SCORES[r]))
  return (
    dataTypeScore +
    reasonsScore +
    Math.abs(probChange) * 0.25 +
    importanceScore * 0.3 +
    conversionScore * 0.1 +
    (1 - interestDistance) * 0.15 +
    (reasons.includes('contract_in_group_you_are_in')
      ? Math.random() * randomGroupCoefficient
      : 0)
  )
}

export const INTEREST_DISTANCE_THRESHOLDS: Record<FEED_DATA_TYPES, number> = {
  contract_probability_changed: 0.13,
  trending_contract: 0.15,
  new_contract: 0.125,
  new_subsidy: 0.15,
  repost: 0.125,
  high_conversion: 0.125,
}

export const FeedExplanationDictionary: Record<
  FEED_DATA_TYPES,
  Partial<Record<FEED_REASON_TYPES, string>>
> = {
  high_conversion: {
    follow_user: 'High conversion question by a creator you follow',
    contract_in_group_you_are_in:
      'High conversion question in a group you are in',
    similar_interest_vector_to_contract:
      'High conversion question you may be interested in',
  },
  new_contract: {
    contract_in_group_you_are_in: 'New question in a group you are in',
    similar_interest_vector_to_contract:
      'New question you may be interested in',
    follow_user: 'New question by a creator you follow',
  },
  contract_probability_changed: {
    follow_contract: 'Market movement on question you follow',
    liked_contract: 'Market movement on question you liked',
    contract_in_group_you_are_in:
      'Market movement on question in a group you are in',
    similar_interest_vector_to_contract:
      'Market movement on question you may be interested in',
    follow_user: 'Market movement on question by a creator you follow',
  },
  trending_contract: {
    follow_contract: 'Trending question you follow',
    liked_contract: 'Trending question you liked',
    contract_in_group_you_are_in: 'Trending question in a group you are in',
    similar_interest_vector_to_contract:
      'Trending question you may be interested in',
    follow_user: 'Trending question by a creator you follow',
  },
  new_subsidy: {
    contract_in_group_you_are_in:
      'New subsidy on question in a group you are in',
    similar_interest_vector_to_contract:
      'New subsidy on a question you may be interested in',
    follow_user: 'New subsidy by a creator you follow',
  },
  repost: {
    contract_in_group_you_are_in: 'Question reposted in a group you are in',
    similar_interest_vector_to_contract:
      'New reposted question you may be interested in',
    follow_user: 'New reposted question by a creator you follow',
  },
}

export function getExplanation(
  feedDataType: FEED_DATA_TYPES,
  feedReasonType: FEED_REASON_TYPES
): string | undefined {
  return FeedExplanationDictionary[feedDataType][feedReasonType]
}

export type ProbChangeData = {
  currentProb: number
  previousProb: number
}

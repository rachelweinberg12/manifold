import { createSupabaseDirectClient } from 'shared/supabase/init'
import { log } from 'shared/utils'

import { convertContract } from 'common/supabase/contracts'

import {
  CONTRACT_FEED_REASON_TYPES,
  FEED_DATA_TYPES,
  INTEREST_DISTANCE_THRESHOLDS,
} from 'common/feed'
import { Contract } from 'common/contract'
import {
  getUsersWithSimilarInterestVectorsToContractServerSide,
  getUserToReasonsInterestedInContractAndUser,
} from 'shared/supabase/contracts'
import { bulkInsertDataToUserFeed } from 'shared/create-feed'
import { userInterestEmbeddings } from 'shared/supabase/vectors'
import { getMostlyActiveUserIds } from 'shared/supabase/users'
import {
  randomNumberThreshold,
  seenUserIds,
} from 'shared/add-interesting-contracts-to-feed'

const MINUTE_INTERVAL = 60
export async function addConvertingContractsToFeed() {
  const pg = createSupabaseDirectClient()
  log(`Starting feed population. `)
  const mostlyActiveUserIds = await getMostlyActiveUserIds(
    pg,
    randomNumberThreshold(MINUTE_INTERVAL)
  )
  log(`Loaded users. Querying candidate contracts...`)
  const contracts = await pg.map(
    `select data, importance_score, conversion_score from contracts
            where resolution_time is null
            and close_time > now() + interval '30 minutes'
            and visibility = 'public'
            and (data->'uniqueBettorCount')::bigint > 10
            and (data->'prob' is null or ((data->'prob')::numeric > 0.04 and (data->'prob')::numeric < 0.96))
            order by conversion_score desc
            limit 10
            `,
    [],
    convertContract
  )
  log(`Found ${contracts.length} contracts to add to feed`)
  for (const contract of contracts) {
    await addContractToFeedIfUnseen(
      contract,
      [
        'follow_user',
        'contract_in_group_you_are_in',
        'similar_interest_vector_to_contract',
      ],
      'high_conversion',
      [contract.creatorId],
      mostlyActiveUserIds
    )
  }
  log('Done adding converting contracts to feed')
}

const addContractToFeedIfUnseen = async (
  contract: Contract,
  reasonsToInclude: CONTRACT_FEED_REASON_TYPES[],
  dataType: FEED_DATA_TYPES,
  userIdsToExclude: string[],
  mostlyActiveUserIds: string[]
) => {
  const pg = createSupabaseDirectClient()
  const usersToReasonsInterestedInContract =
    await getUserToReasonsInterestedInContractAndUser(
      contract,
      contract.creatorId,
      pg,
      reasonsToInclude,
      dataType,
      undefined,
      Object.keys(userInterestEmbeddings).length > 0
        ? () =>
            getUsersWithSimilarInterestVectorsToContractServerSide(
              contract.id,
              pg,
              INTEREST_DISTANCE_THRESHOLDS[dataType]
            )
        : undefined
    )

  const ignoreUserIds = await seenUserIds(
    contract.id,
    Object.keys(usersToReasonsInterestedInContract),
    [dataType, 'new_contract'],
    pg
  )

  await bulkInsertDataToUserFeed(
    usersToReasonsInterestedInContract,
    contract.createdTime,
    dataType,
    userIdsToExclude
      .concat(ignoreUserIds)
      .concat(
        Object.keys(usersToReasonsInterestedInContract).filter(
          (id) => !mostlyActiveUserIds.includes(id)
        )
      ),
    {
      contractId: contract.id,
      creatorId: contract.creatorId,
    },
    pg
  )
}

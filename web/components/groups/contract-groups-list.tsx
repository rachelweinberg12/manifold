import { Contract } from 'common/contract'
import { Group } from 'common/group'
import { User } from 'common/user'
import toast from 'react-hot-toast'
import { Col } from 'web/components/layout/col'
import { Row } from 'web/components/layout/row'
import Link from 'next/link'
import {
  addContractToGroup,
  removeContractFromGroup,
} from 'web/lib/firebase/api'
import { GroupSelector } from './group-selector'
import { useGroupsWithContract } from 'web/hooks/use-group-supabase'
import { useState } from 'react'
import { XIcon } from '@heroicons/react/outline'
import { CategoryTag } from 'web/components/groups/category-tag'

export function ContractGroupsList(props: {
  contract: Contract
  user: User | null | undefined
  canEdit: boolean
  onlyGroupIds?: string[]
  canEditGroup: (group: Group) => boolean
}) {
  const { user, canEditGroup, onlyGroupIds, contract, canEdit } = props
  const groups = useGroupsWithContract(contract) ?? []
  const isCreator = contract.creatorId === user?.id
  const [error, setError] = useState<string>('')

  return (
    <Col className={'gap-2'}>
      <span className={'text-primary-700 text-xl'}>
        <Link href={'/categories/'}>To</Link>
      </span>
      <Col className="h-96 justify-between overflow-auto">
        <Col>
          {groups.length === 0 && (
            <Col className="text-ink-400">No topics yet...</Col>
          )}
          <Row className="my-2 flex-wrap gap-3">
            {groups.map((g) => {
              return (
                <CategoryTag
                  location={'categories list'}
                  key={g.id}
                  category={g}
                  className="bg-ink-100"
                >
                  {g && canEditGroup(g) && (
                    <button
                      onClick={() => {
                        toast.promise(
                          removeContractFromGroup({
                            groupId: g.id,
                            contractId: contract.id,
                          }).catch((e) => {
                            console.error(e.message)
                            throw e
                          }),
                          {
                            loading: `Removing question from "${g.name}"`,
                            success: `Successfully removed question from "${g.name}"!`,
                            error: `Error removing category. Try again?`,
                          }
                        )
                      }}
                    >
                      <XIcon className="hover:text-ink-700 text-ink-400 ml-1 h-4 w-4" />
                    </button>
                  )}
                </CategoryTag>
              )
            })}
          </Row>
          {canEdit && (
            <Col className={'my-2 items-center justify-between p-0.5'}>
              <Row className="text-ink-400 w-full justify-start text-sm">
                Add topics
              </Row>
              <GroupSelector
                ignoreGroupIds={groups.map((g) => g.id)}
                setSelectedGroup={(group) =>
                  group &&
                  addContractToGroup({
                    groupId: group.id,
                    contractId: contract.id,
                  }).catch((e) => {
                    console.error(e.message)
                    setError(e.message)
                  })
                }
                isContractCreator={isCreator}
                onlyGroupIds={onlyGroupIds}
              />
              <span className={'text-sm text-red-400'}>{error}</span>
            </Col>
          )}
        </Col>
      </Col>
    </Col>
  )
}

import { GetSubscriptionInfoByShortUuidCommand } from '@umiji/backend-contract'

export interface IState {
    subscription: GetSubscriptionInfoByShortUuidCommand.Response['response'] | null
}

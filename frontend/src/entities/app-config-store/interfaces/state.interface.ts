import {
    TSubscriptionPageLanguageCode,
    TSubscriptionPageRawConfig
} from '@umiji/subscription-page-types'

export interface IState {
    config: null | TSubscriptionPageRawConfig
    currentLang: TSubscriptionPageLanguageCode
    isConfigLoaded: boolean
}

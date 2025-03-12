import * as API from '../src/api.js'

export interface Context {
  blockStore: API.IndexStore<API.BlockIndexRecordView>
}

export type TestFn = (context: Context) => unknown
export type Tests = Record<string, TestFn>

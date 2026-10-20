import { sdk } from '../sdk'
import { config } from './config'
import { deleteRpcUser, generateRpcUser } from './rpcUser'

export const actions = sdk.Actions.of()
  .addAction(config)
  .addAction(generateRpcUser)
  .addAction(deleteRpcUser)

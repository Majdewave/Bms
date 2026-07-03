import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import {
  TEAM_CHAT_EVENT_NAMES,
  TEAM_CHAT_HUB_PATH,
  TEAM_CHAT_RECONNECT_DELAYS_MS,
} from '../constants/teamChatConstants'
import type { TeamChatConnectionState } from '../types/TeamChatConnectionState'
import type { TeamChatMessage } from '../types/TeamChatMessage'
import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import { normalizeOnlineUsers } from '../utils/normalizeOnlineUsers'
import { normalizeTeamChatMessage } from '../utils/normalizeTeamChatMessage'
import { teamChatLogger } from '../utils/teamChatLogger'

type OnlineUsersHandler = (users: TeamChatOnlineUser[]) => void
type MessageHandler = (message: TeamChatMessage) => void
type ConnectionStateHandler = (state: TeamChatConnectionState) => void

interface TeamChatServiceOptions {
  baseUrl: string
  accessTokenFactory: () => string
}

export class TeamChatService {
  private readonly options: TeamChatServiceOptions
  private connection: HubConnection | null = null
  private hasLoadedInitialSnapshot = false
  private connectionState: TeamChatConnectionState = 'Disconnected'
  private readonly onlineUsersHandlers = new Set<OnlineUsersHandler>()
  private readonly messageHandlers = new Set<MessageHandler>()
  private readonly connectionStateHandlers = new Set<ConnectionStateHandler>()

  constructor(options: TeamChatServiceOptions) {
    this.options = options
  }

  subscribeOnlineUsers(handler: OnlineUsersHandler) {
    this.onlineUsersHandlers.add(handler)
    return () => {
      this.onlineUsersHandlers.delete(handler)
    }
  }

  subscribeConnectionState(handler: ConnectionStateHandler) {
    this.connectionStateHandlers.add(handler)
    handler(this.connectionState)
    return () => {
      this.connectionStateHandlers.delete(handler)
    }
  }

  subscribeMessages(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  async start() {
    const token = this.options.accessTokenFactory().trim()
    if (!token) {
      this.setConnectionState('Disconnected')
      teamChatLogger.warn('Start skipped: authentication token is missing')
      return
    }

    this.ensureConnection()

    if (!this.connection) {
      this.setConnectionState('Disconnected')
      return
    }

    if (this.connection.state === HubConnectionState.Connected) {
      this.setConnectionState('Connected')
      return
    }

    if (this.connection.state === HubConnectionState.Connecting || this.connection.state === HubConnectionState.Reconnecting) {
      return
    }

    try {
      this.setConnectionState('Connecting')
      await this.connection.start()
      this.setConnectionState('Connected')
      teamChatLogger.info('Connected')

      if (!this.hasLoadedInitialSnapshot) {
        await this.loadInitialOnlineUsers()
        this.hasLoadedInitialSnapshot = true
      }
    } catch (error) {
      this.setConnectionState('Disconnected')
      teamChatLogger.error('Connection failed', error)
    }
  }

  async stop() {
    if (!this.connection) {
      this.setConnectionState('Disconnected')
      return
    }

    try {
      await this.connection.stop()
    } catch (error) {
      teamChatLogger.error('Disconnect failed', error)
    } finally {
      this.hasLoadedInitialSnapshot = false
      this.setConnectionState('Disconnected')
      teamChatLogger.info('Disconnected')
    }
  }

  async dispose() {
    await this.reset()
  }

  async reset() {
    if (!this.connection) {
      this.hasLoadedInitialSnapshot = false
      this.setConnectionState('Disconnected')
      this.emitOnlineUsers([])
      return
    }

    this.connection.off(TEAM_CHAT_EVENT_NAMES.OnlineUsersChanged)
    this.connection.off(TEAM_CHAT_EVENT_NAMES.ReceiveMessage)

    try {
      await this.connection.stop()
    } catch (error) {
      teamChatLogger.error('Reset stop failed', error)
    } finally {
      this.connection = null
      this.hasLoadedInitialSnapshot = false
      this.setConnectionState('Disconnected')
      this.emitOnlineUsers([])
    }
  }

  private ensureConnection() {
    if (this.connection) return

    const hubUrl = `${this.options.baseUrl}${TEAM_CHAT_HUB_PATH}`

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: this.options.accessTokenFactory,
      })
      .withAutomaticReconnect(TEAM_CHAT_RECONNECT_DELAYS_MS)
      .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.None)
      .build()

    this.connection.onreconnecting((error) => {
      this.setConnectionState('Reconnecting')
      teamChatLogger.info('Reconnecting', error ?? undefined)
    })

    this.connection.onreconnected(() => {
      this.setConnectionState('Connected')
      teamChatLogger.info('Reconnected')
    })

    this.connection.onclose((error) => {
      this.setConnectionState('Disconnected')
      teamChatLogger.warn('Disconnected', error ?? undefined)
    })

    this.connection.off(TEAM_CHAT_EVENT_NAMES.OnlineUsersChanged)
    this.connection.on(TEAM_CHAT_EVENT_NAMES.OnlineUsersChanged, (payload: unknown) => {
      const users = normalizeOnlineUsers(payload)
      this.emitOnlineUsers(users)
      teamChatLogger.info('OnlineUsersChanged', { count: users.length })
    })

    this.connection.off(TEAM_CHAT_EVENT_NAMES.ReceiveMessage)
    this.connection.on(TEAM_CHAT_EVENT_NAMES.ReceiveMessage, (payload: unknown) => {
      const message = normalizeTeamChatMessage(payload)
      if (!message) {
        return
      }

      this.emitMessage(message)
    })
  }

  async sendMessage(recipientUserId: string, text: string) {
    const normalizedText = text.trim()
    if (!recipientUserId || !normalizedText) {
      return
    }

    this.ensureConnection()
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error('TEAM_CHAT_OFFLINE')
    }

    try {
      await this.connection.invoke('SendMessage', recipientUserId, normalizedText)
    } catch (error) {
      teamChatLogger.error('SendMessage failed', error)
      throw new Error('TEAM_CHAT_SEND_FAILED')
    }
  }

  private async loadInitialOnlineUsers() {
    if (!this.connection) return

    try {
      const payload = await this.connection.invoke('GetOnlineUsers')
      const users = normalizeOnlineUsers(payload)
      this.emitOnlineUsers(users)
    } catch (error) {
      teamChatLogger.error('GetOnlineUsers failed', error)
    }
  }

  private emitOnlineUsers(users: TeamChatOnlineUser[]) {
    this.onlineUsersHandlers.forEach((handler) => {
      handler(users)
    })
  }

  private emitMessage(message: TeamChatMessage) {
    this.messageHandlers.forEach((handler) => {
      handler(message)
    })
  }

  private setConnectionState(nextState: TeamChatConnectionState) {
    if (this.connectionState === nextState) return

    this.connectionState = nextState
    this.connectionStateHandlers.forEach((handler) => {
      handler(nextState)
    })
  }
}

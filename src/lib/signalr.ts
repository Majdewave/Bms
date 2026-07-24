import * as signalR from '@microsoft/signalr'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'

export const connection = new signalR.HubConnectionBuilder()
  .withUrl(
    `${getApiBaseUrl()}/hubs/appointments`,
    {
      accessTokenFactory: () =>
        localStorage.getItem('token') || '',
    }
  )
  .withAutomaticReconnect()
  .build()
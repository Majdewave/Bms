import * as signalR from '@microsoft/signalr'

export const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${(import.meta as any).env.VITE_API_URL}/hubs/appointments`)
  .withAutomaticReconnect()
  .build()

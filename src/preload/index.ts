import { contextBridge, ipcRenderer } from 'electron';
import type { IpcChannel, IpcArgs, IpcReturn } from '../shared/ipc-types';

const api = {
  invoke: <C extends IpcChannel>(
    channel: C,
    ...args: IpcArgs<C> extends void ? [] : [IpcArgs<C>]
  ): Promise<IpcReturn<C>> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  windowIsMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke('window:is-maximized'),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;

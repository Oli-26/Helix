import { ipcMain, shell } from 'electron';
import { exec } from 'node:child_process';

export function registerShellHandlers(): void {
  ipcMain.handle('shell:open-external', async (_e, args) => {
    await shell.openExternal(args.url);
  });

  ipcMain.handle('shell:open-in-terminal', async (_e, args) => {
    const platform = process.platform;
    if (platform === 'linux') {
      exec(`x-terminal-emulator --working-directory="${args.path}"`);
    } else if (platform === 'darwin') {
      exec(`open -a Terminal "${args.path}"`);
    } else if (platform === 'win32') {
      exec(`start cmd /k "cd /d ${args.path}"`);
    }
  });
}

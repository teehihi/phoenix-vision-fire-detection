const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('phoenixDesktop', {
  platform: process.platform
});

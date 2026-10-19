'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('merDesktop', Object.freeze({
  apiBase: ipcRenderer.sendSync('mer:get-api-base'),
  saveApiBase: value => ipcRenderer.invoke('mer:save-api-base', value)
}));

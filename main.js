// This is standard boilerplate to set up a new Electron window.
// Please refer to the Electron tutorials for more information.
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const remoteMain = require("@electron/remote/main");
const path = require('path')
const { autoUpdater } = require('electron-updater');

app.setAppUserModelId("hsr-scanner");
app.setAsDefaultProtocolClient('hsr-scanner');

app.allowRendererProcessReuse = false

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 900,
        icon: __dirname + '/icon.ico',
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    mainWindow.loadFile('index.html')
    mainWindow.webContents.setBackgroundThrottling(false);
    remoteMain.initialize();

    require('@electron/remote/main').enable(mainWindow.webContents)
    const version = app.getVersion()

    mainWindow.once("ready-to-show", () => {
      autoUpdater.checkForUpdatesAndNotify();
    });

    autoUpdater.on('update-available', () => {
      mainWindow.webContents.send('update_available');
    });
    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update_downloaded');
    });
    ipcMain.on('restart_app', () => {
      autoUpdater.quitAndInstall();
    });

    return mainWindow
}

app.whenReady().then(() => {
    // This code is invoked once Electron is ready.
    let win = createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})
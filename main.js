const { app, BrowserWindow, Menu } = require('electron');
require('@electron/remote/main').initialize();
const fs = require('fs');
const path = require('path');

// Define paths for your resources
const appResourcesPath = path.join(__dirname, 'resources');
const jsonFileName = 'barcodes.json';
const writablePath = path.join(app.getPath('userData'), jsonFileName);

function copyJsonFileToWritableLocation() {
    try {
        const sourcePath = path.join(appResourcesPath, jsonFileName);
        if (!fs.existsSync(writablePath)) {
            // Create empty file if source doesn't exist
            fs.writeFileSync(writablePath, JSON.stringify([], null, 4));
        }
    } catch (error) {
        console.error('Error initializing JSON file:', error);
    }
}

function createWindow() {
    const iconPath = process.platform === 'darwin' 
        ? path.join(__dirname, 'appicons/icon.icns')
        : path.join(__dirname, 'appicons/icon.ico');

    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: iconPath
    });

    require('@electron/remote/main').enable(win.webContents);
    win.loadFile('index.html');


    const menuTemplate = [
        {
            label: app.name,
            submenu: [
                {
                    label: 'About ' + app.name,
                    role: 'about'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        win.reload();
                    }
                },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        // Set macOS-specific menu
        const macMenu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(macMenu);
    } else {
        // For Windows and other platforms, use the general menu
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);
    }
}

app.whenReady().then(() => {
    createWindow();
    copyJsonFileToWritableLocation();  

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, 'appicons/icon.icns'));
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
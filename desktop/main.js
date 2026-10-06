const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("node:path");

const HOME = "http://localhost:3001";
let ventana;

function abrirEnNavegador(url) {
  try {
    const parsed = new URL(url);
    if (["https:", "http:"].includes(parsed.protocol)) {
      shell.openExternal(url).catch(console.error);
    }
  } catch {}
}

function esClawde(url) {
  try {
    return new URL(url).origin === HOME;
  } catch {
    return false;
  }
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Clawde · Beta",
    icon: path.join(__dirname, "assets", "logo-clawde.png"),
    backgroundColor: "#faf9f5",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  ventana.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    ventana.setTitle("Clawde · Beta");
  });

  ventana.webContents.setWindowOpenHandler(({ url }) => {
    abrirEnNavegador(url);
    return { action: "deny" };
  });

  ventana.webContents.on("will-navigate", (event, url) => {
    if (!esClawde(url)) {
      event.preventDefault();
      abrirEnNavegador(url);
    }
  });

  ventana.webContents.session.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      const origen = details.requestingUrl || contents.getURL();
      const medios = details.mediaTypes || [];
      callback(
        contents === ventana.webContents &&
        esClawde(origen) &&
        permission === "media" &&
        medios.length > 0 &&
        medios.every(tipo => tipo === "audio")
      );
    }
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: "Clawde",
      submenu: [
        {
          label: "Inicio",
          click: () => ventana.loadURL(HOME).catch(console.error)
        },
        {
          label: "Abrir en navegador",
          click: () => abrirEnNavegador(HOME)
        },
        { type: "separator" },
        { role: "quit", label: "Salir" }
      ]
    },
    {
      label: "Ver",
      submenu: [
        { role: "reload", label: "Recargar" },
        { role: "resetZoom", label: "Restablecer zoom" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
        { role: "togglefullscreen", label: "Pantalla completa" }
      ]
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Sitio del proyecto",
          click: () => abrirEnNavegador("https://www.clawde.cl")
        },
        {
          label: "Acerca de Clawde",
          click: () => dialog.showMessageBox(ventana, {
            type: "info",
            title: "Clawde",
            message: "Clawde · Beta 0.1.0",
            detail: "Patricio Muñoz\nLocal AI Lab\nProyecto personal de estudio y experimentación."
          })
        }
      ]
    }
  ]));

  ventana.webContents.on("did-fail-load",
    async (_event, code, _description, _url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      const respuesta = await dialog.showMessageBox(ventana, {
        type: "warning",
        title: "Clawde no está disponible",
        message: "No se pudo cargar http://localhost:3001",
        detail: "Comprueba que Docker Desktop esté iniciado y ejecuta docker compose up -d desde C:\\AI\\claude-casero.",
        buttons: ["Reintentar", "Cerrar"],
        defaultId: 0,
        cancelId: 1
      });
      if (ventana.isDestroyed()) return;
      if (respuesta.response === 0) {
        ventana.loadURL(HOME).catch(console.error);
      } else {
        ventana.close();
      }
    }
  );

  ventana.loadURL(HOME).catch(console.error);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (ventana && !ventana.isDestroyed()) {
      if (ventana.isMinimized()) ventana.restore();
      ventana.focus();
    }
  });
  app.whenReady().then(crearVentana);
  app.on("window-all-closed", () => app.quit());
}
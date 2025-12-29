class SorteadorApp {
  constructor() {
    this.state = {
      currentScreen: "screen-menu",
      mode: null,
      numbers: { min: 1, max: 100, drawn: [], available: [] },
      names: { list: [], drawn: [] },
      settings: { theme: "auto", speed: 3000, sound: true },
    };

    this.audio = {
      drum: new Audio("drum.mp3"),
      win: new Audio("win.mp3"),
    };

    this.screens = document.querySelectorAll(".screen");
    this.confettiCanvas = document.getElementById("confetti-canvas");
    this.confettiCtx = this.confettiCanvas.getContext("2d");

    this.init();
  }

  init() {
    this.loadSettings();
    this.bindEvents();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (this.state.settings.theme === "auto") this.applyTheme("auto");
      });

    if (localStorage.getItem("sorteioState_v2")) {
      document.getElementById("modalRecover").classList.remove("hidden");
    }
  }

  // --- TEMAS ---
  applyTheme(themePreference) {
    const toggle = document.getElementById("toggleTheme");
    if (themePreference === "dark") {
      document.body.setAttribute("data-theme", "dark");
      toggle.checked = true;
    } else if (themePreference === "light") {
      document.body.removeAttribute("data-theme");
      toggle.checked = false;
    } else {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (systemDark) {
        document.body.setAttribute("data-theme", "dark");
        toggle.checked = true;
      } else {
        document.body.removeAttribute("data-theme");
        toggle.checked = false;
      }
    }
  }

  // --- PERSISTÊNCIA ---
  saveState() {
    localStorage.setItem("sorteioState_v2", JSON.stringify(this.state));
  }

  loadState() {
    const saved = localStorage.getItem("sorteioState_v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      this.state.mode = parsed.mode;
      this.state.numbers = parsed.numbers;
      this.state.names = parsed.names;
      this.goToScreen(parsed.currentScreen);
      if (this.state.mode === "numbers") this.updateNumbersUI();
      if (this.state.mode === "names") this.updateNamesUI();
    }
  }

  discardState() {
    localStorage.removeItem("sorteioState_v2");
    this.state.currentScreen = "screen-menu";
    this.state.numbers = { min: 1, max: 100, drawn: [], available: [] };
    this.state.names = { list: [], drawn: [] };
    this.goToScreen("screen-menu");
  }

  // --- EVENTOS ---
  bindEvents() {
    // Navegação
    document.querySelectorAll(".menu-card").forEach((card) => {
      card.addEventListener("click", () =>
        this.goToScreen(
          card.dataset.target === "numbers"
            ? "screen-numbers-setup"
            : "screen-names-setup"
        )
      );
    });
    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.goToScreen(btn.dataset.back);
        this.discardState();
      });
    });

    // Números
    document
      .getElementById("btnStartNumbers")
      .addEventListener("click", () => this.initNumberDraw());
    document
      .getElementById("btnDrawNumber")
      .addEventListener("click", () => this.drawNumber());
    document.getElementById("btnResetNumber").addEventListener("click", () => {
      if (confirm("Reiniciar?")) this.initNumberDraw();
    });
    document.getElementById("btnBackNumPlay").addEventListener("click", () => {
      if (confirm("Sair?")) {
        this.discardState();
        this.goToScreen("screen-menu");
      }
    });

    // Nomes
    document
      .getElementById("btnVerifyNames")
      .addEventListener("click", () => this.processNamesInput());
    document
      .getElementById("btnImportFile")
      .addEventListener("click", () =>
        document.getElementById("fileInput").click()
      );
    document
      .getElementById("fileInput")
      .addEventListener("change", (e) => this.handleFileUpload(e));
    document
      .getElementById("btnDrawName")
      .addEventListener("click", () => this.drawName());
    document.getElementById("btnResetName").addEventListener("click", () => {
      if (confirm("Reiniciar?")) this.resetNameDraw();
    });
    document.getElementById("btnBackNamePlay").addEventListener("click", () => {
      if (confirm("Sair?")) {
        this.discardState();
        this.goToScreen("screen-menu");
      }
    });

    // Tabs e Modais
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".list-container")
          .forEach((l) => l.classList.remove("active"));
        e.target.classList.add("active");
        const tab = e.target.dataset.tab;
        document
          .getElementById(tab === "history" ? "listHistory" : "listPending")
          .classList.add("active");
      });
    });

    document
      .getElementById("btnOpenSettings")
      .addEventListener("click", () =>
        document.getElementById("modalSettings").classList.remove("hidden")
      );
    document
      .getElementById("btnCloseSettings")
      .addEventListener("click", () =>
        document.getElementById("modalSettings").classList.add("hidden")
      );
    document.getElementById("modalSettings").addEventListener("click", (e) => {
      if (e.target.id === "modalSettings")
        document.getElementById("modalSettings").classList.add("hidden");
    });
    document
      .getElementById("btnSaveSettings")
      .addEventListener("click", () => this.saveSettingsFromModal());

    document
      .getElementById("btnRecoverSession")
      .addEventListener("click", () => {
        document.getElementById("modalRecover").classList.add("hidden");
        this.loadState();
      });
    document
      .getElementById("btnDiscardSession")
      .addEventListener("click", () => {
        document.getElementById("modalRecover").classList.add("hidden");
        this.discardState();
      });
  }

  goToScreen(screenId) {
    this.screens.forEach((s) => s.classList.add("hidden"));
    document.getElementById(screenId).classList.remove("hidden");
    this.state.currentScreen = screenId;
  }

  // --- LOGICA NUMEROS ---
  initNumberDraw() {
    const min = parseInt(document.getElementById("numMin").value);
    const max = parseInt(document.getElementById("numMax").value);
    if (min >= max) return alert("Mínimo deve ser menor que o Máximo.");

    this.state.mode = "numbers";
    this.state.numbers.min = min;
    this.state.numbers.max = max;
    this.state.numbers.drawn = [];
    this.state.numbers.available = [];
    for (let i = min; i <= max; i++) this.state.numbers.available.push(i);

    this.updateNumbersUI();
    this.goToScreen("screen-numbers-play");
    this.saveState();
  }

  drawNumber() {
    if (this.state.numbers.available.length === 0) return alert("Finalizado!");
    this.animateSuspense(
      document.getElementById("displayNumber"),
      this.state.numbers.available,
      (winner) => {
        const index = this.state.numbers.available.indexOf(winner);
        this.state.numbers.available.splice(index, 1);
        this.state.numbers.drawn.unshift(winner);
        this.updateNumbersUI(winner);
        this.saveState();
      }
    );
  }

  updateNumbersUI(winner = null) {
    const display = document.getElementById("displayNumber");
    const grid = document.getElementById("historyGridNum");
    const count = document.getElementById("countNum");

    display.innerText = winner || "---";
    display.style.color = winner ? "var(--success)" : "var(--text-muted)";

    grid.innerHTML = "";
    this.state.numbers.drawn.forEach((num, idx) => {
      const ball = document.createElement("div");
      ball.className = `ball ${idx === 0 ? "latest" : ""}`;
      ball.innerText = num;
      grid.appendChild(ball);
    });
    count.innerText = this.state.numbers.drawn.length;
  }

  // --- LOGICA NOMES ---
  sanitize(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("namesInput").value = e.target.result;
    };
    reader.readAsText(file);
  }

  processNamesInput() {
    const raw = document.getElementById("namesInput").value;
    const list = raw
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n !== "");
    if (list.length < 2) return alert("Mínimo de 2 nomes.");

    this.state.mode = "names";
    this.state.names.list = list;
    this.state.names.drawn = [];
    this.updateNamesUI();
    this.goToScreen("screen-names-play");
    this.saveState();
  }

  drawName() {
    if (this.state.names.list.length === 0) return alert("Todos sorteados!");
    this.animateSuspense(
      document.getElementById("displayName"),
      this.state.names.list,
      (winner) => {
        const index = this.state.names.list.indexOf(winner);
        this.state.names.list.splice(index, 1);
        this.state.names.drawn.unshift(winner);
        this.updateNamesUI(winner);
        this.saveState();
      }
    );
  }

  resetNameDraw() {
    this.state.names.list = [
      ...this.state.names.list,
      ...this.state.names.drawn,
    ];
    this.state.names.drawn = [];
    this.updateNamesUI();
    this.saveState();
  }

  updateNamesUI(winner = null) {
    const display = document.getElementById("displayName");
    const listHistory = document.getElementById("listHistory");
    const listPending = document.getElementById("listPending");

    document.getElementById("countRest").innerText =
      this.state.names.list.length;
    document.getElementById("countDrawn").innerText =
      this.state.names.drawn.length;

    if (winner) {
      display.innerText = winner;
      display.classList.remove("small-text");
      display.style.color = "var(--success)";
    } else {
      display.innerText = "Pronto?";
      display.classList.add("small-text");
      display.style.color = "var(--text-muted)";
    }

    listHistory.innerHTML = this.state.names.drawn
      .map((n) => `<span class="name-tag winner">${this.sanitize(n)}</span>`)
      .join("");
    listPending.innerHTML = this.state.names.list
      .map((n) => `<span class="name-tag">${this.sanitize(n)}</span>`)
      .join("");
  }

  // --- ANIMACAO ---
  animateSuspense(element, sourceArray, callback) {
    const btns = document.querySelectorAll("button");
    btns.forEach((b) => (b.disabled = true));

    let elapsed = 0;
    const duration = parseInt(this.state.settings.speed);
    if (this.state.settings.sound) this.playSound("drum");

    const interval = setInterval(() => {
      element.innerText =
        sourceArray[Math.floor(Math.random() * sourceArray.length)];
      element.style.color = "var(--text-muted)";
      elapsed += 50;
      if (elapsed >= duration) {
        clearInterval(interval);
        const winner =
          sourceArray[Math.floor(Math.random() * sourceArray.length)];
        if (this.state.settings.sound) this.playSound("win");
        this.fireConfetti();
        btns.forEach((b) => (b.disabled = false));
        callback(winner);
      }
    }, 50);
  }

  playSound(type) {
    try {
      if (this.audio[type]) {
        this.audio[type].currentTime = 0;
        this.audio[type].play().catch(() => {});
      }
    } catch (e) {}
  }

  fireConfetti() {
    let p = [];
    const colors = ["#4f46e5", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"];
    for (let i = 0; i < 100; i++)
      p.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 1) * 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100,
      });
    const animate = () => {
      this.confettiCtx.clearRect(
        0,
        0,
        this.confettiCanvas.width,
        this.confettiCanvas.height
      );
      let active = false;
      p.forEach((pt) => {
        pt.life--;
        if (pt.life > 0) {
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.vy += 0.5;
          this.confettiCtx.fillStyle = pt.color;
          this.confettiCtx.fillRect(pt.x, pt.y, pt.size, pt.size);
          active = true;
        }
      });
      if (active) requestAnimationFrame(animate);
    };
    animate();
  }

  resizeCanvas() {
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
  }

  loadSettings() {
    const saved = localStorage.getItem("sorteioSettings_v1");
    if (saved) this.state.settings = JSON.parse(saved);
    else this.state.settings.theme = "auto";
    this.applyTheme(this.state.settings.theme);
    document.getElementById("selectSpeed").value = this.state.settings.speed;
    document.getElementById("toggleSound").checked = this.state.settings.sound;
  }

  saveSettingsFromModal() {
    const themeInput = document.getElementById("toggleTheme").checked;
    const newTheme = themeInput ? "dark" : "light";
    this.state.settings.theme = newTheme;
    this.state.settings.speed = document.getElementById("selectSpeed").value;
    this.state.settings.sound = document.getElementById("toggleSound").checked;
    this.applyTheme(newTheme);
    localStorage.setItem(
      "sorteioSettings_v1",
      JSON.stringify(this.state.settings)
    );
    document.getElementById("modalSettings").classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new SorteadorApp();
});

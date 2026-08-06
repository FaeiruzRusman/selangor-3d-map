const STORAGE_KEY = "suoWorkspacePanelStateV80";

export class WorkspaceController {
  constructor({ map, compare }) {
    this.map = map;
    this.compare = compare;

    this.workspace = document.getElementById("workspace");
    this.leftSidebar = document.getElementById("leftSidebar");
    this.rightSidebar = document.getElementById("rightSidebar");
    this.openLeftPanelTab = document.getElementById("openLeftPanelTab");
    this.openRightPanelTab = document.getElementById("openRightPanelTab");
    this.focusMapBtn = document.getElementById("focusMapBtn");

    this.state = {
      leftOpen: true,
      rightOpen: true
    };

    this.stateBeforeFocus = null;
    this.resizeTimer = null;

    this.readState();
    this.bind();
    this.render({ persist: false });
  }

  readState() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null"
      );

      if (
        saved &&
        typeof saved.leftOpen === "boolean" &&
        typeof saved.rightOpen === "boolean"
      ) {
        this.state = saved;
      }
    } catch (_) {}
  }

  saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.state)
      );
    } catch (_) {}
  }

  bind() {
    document.getElementById("closeLeftPanelBtn")
      ?.addEventListener("click", () => this.setLeft(false));

    document.getElementById("closeRightPanelBtn")
      ?.addEventListener("click", () => this.setRight(false));

    this.openLeftPanelTab?.addEventListener(
      "click",
      () => this.setLeft(true)
    );

    this.openRightPanelTab?.addEventListener(
      "click",
      () => this.setRight(true)
    );

    this.focusMapBtn?.addEventListener(
      "click",
      () => this.toggleFocus()
    );

    document.getElementById("mobileMenuBtn")
      ?.addEventListener("click", () => {
        this.leftSidebar?.classList.toggle("open");
      });

    document.getElementById("rightPanelToggle")
      ?.addEventListener("click", () => {
        this.rightSidebar?.classList.toggle("open");
      });

    window.addEventListener(
      "resize",
      () => this.resizeMaps()
    );
  }

  setLeft(open) {
    this.state.leftOpen = Boolean(open);
    this.render();
  }

  setRight(open) {
    this.state.rightOpen = Boolean(open);
    this.render();
  }

  toggleFocus() {
    const focused =
      !this.state.leftOpen &&
      !this.state.rightOpen;

    if (focused) {
      this.state = this.stateBeforeFocus || {
        leftOpen: true,
        rightOpen: true
      };
      this.stateBeforeFocus = null;
    } else {
      this.stateBeforeFocus = { ...this.state };
      this.state = {
        leftOpen: false,
        rightOpen: false
      };
    }

    this.render();
  }

  render({ persist = true } = {}) {
    if (
      !this.workspace ||
      !this.leftSidebar ||
      !this.rightSidebar
    ) {
      return;
    }

    this.workspace.classList.toggle(
      "left-panel-collapsed",
      !this.state.leftOpen
    );

    this.workspace.classList.toggle(
      "right-panel-collapsed",
      !this.state.rightOpen
    );

    this.leftSidebar.setAttribute(
      "aria-hidden",
      String(!this.state.leftOpen)
    );

    this.rightSidebar.setAttribute(
      "aria-hidden",
      String(!this.state.rightOpen)
    );

    if (this.openLeftPanelTab) {
      this.openLeftPanelTab.hidden = this.state.leftOpen;
    }

    if (this.openRightPanelTab) {
      this.openRightPanelTab.hidden = this.state.rightOpen;
    }

    const focused =
      !this.state.leftOpen &&
      !this.state.rightOpen;

    if (this.focusMapBtn) {
      this.focusMapBtn.classList.toggle(
        "active",
        focused
      );

      this.focusMapBtn.textContent = focused
        ? "▣ Restore Panels"
        : "▣ Focus Map";
    }

    if (persist) {
      this.saveState();
    }

    this.resizeMaps();
  }

  resizeMaps() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    requestAnimationFrame(() => {
      this.map.resize();
      this.compare.compareMap?.resize();
    });

    this.resizeTimer = setTimeout(() => {
      this.map.resize();
      this.compare.compareMap?.resize();
    }, 260);
  }
}

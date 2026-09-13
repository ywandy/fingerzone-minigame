(async () => {
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  try {
    const parts = await Promise.all([
      "vendor/laya.core.part-0",
      "vendor/laya.core.part-1",
    ].map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return response.text();
    }));

    (0, eval)(parts.join(""));
    await loadScript("upgrades.js?v=4");
    await loadScript("game.js?v=4");
  } catch (error) {
    console.error("LayaAir boot failed", error);
    const message = document.querySelector("#engine-error");
    if (message) message.hidden = false;
  }
})();

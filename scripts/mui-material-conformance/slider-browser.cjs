"use strict";
const assert = require("node:assert/strict");
const actual = process.env.VPM_APP_CHECKOUT;
require("./compare-scenes.cjs")(
  "slider",
  async ({ send, evaluate, wait, baseUrl }) => {
    const key = async (name) => {
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: name,
        code: name,
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: name,
        code: name,
      });
    };
    const mouse = (type, x, y, buttons = 0) =>
      send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: type === "mouseMoved" && !buttons ? "none" : "left",
        buttons,
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    for (const version of ["app", "current"])
      for (const lib of ["upstream", "vpm"]) {
        const variant = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + variant });
        await wait("location.pathname==='/" + variant + "' && window.draw");
        if (actual)
          await evaluate(
            require("./app-font-slider.cjs")(actual, process.env.VPM_APP_REF),
          );
        await evaluate(
          "window.draw({},true);window.input=document.querySelector('input');input.focus();window.track=document.querySelector('.MuiSlider-root');true",
        );
        assert.equal(
          await evaluate(
            "document.querySelectorAll('.MuiSlider-markLabel.font-semibold').length",
          ),
          7,
        );
        assert.ok(
          await evaluate(
            "track.classList.contains('MuiSlider-sizeSmall') && track.classList.contains('MuiSlider-colorSecondary')",
          ),
        );
        await key("ArrowRight");
        await wait("Number(input.value)===17.6");
        const applied = await evaluate(
          "document.documentElement.style.fontSize",
        );
        if (lib === "vpm") assert.equal(applied, "17.6px");
        else
          console.log(
            variant + " applied " + applied + " on first keyboard change",
          );
        if (actual) {
          const geometry = await evaluate(
            "({rail:parseFloat(getComputedStyle(track).height),thumb:document.querySelector('.MuiSlider-thumb').getBoundingClientRect().width})",
          );
          assert.ok(geometry.rail > 0 && geometry.thumb > geometry.rail);
        }
        const [x, y, w] = await evaluate(
          "(()=>{const b=track.getBoundingClientRect();return [b.x,b.y+b.height/2,b.width]})()",
        );
        await mouse("mouseMoved", x + w * 0.5, y);
        await mouse("mousePressed", x + w * 0.5, y, 1);
        await wait("Number(input.value)===16");
        await mouse("mouseMoved", x + w * 0.83, y, 1);
        await wait("Number(input.value)===19.2");
        await mouse("mouseReleased", x + w * 0.83, y);
        if (lib === "vpm")
          await wait(
            "Number(input.value)===19.2 && document.documentElement.style.fontSize==='19.2px'",
          );
        assert.ok(
          await evaluate(
            "input===document.activeElement && Number(input.getAttribute('aria-valuenow'))===19.2",
          ),
        );
        await evaluate(
          "window.draw({});window.track=document.querySelector('.MuiSlider-root');window.input=document.querySelector('input');input.focus();window.events.length=0",
        );
        await key("ArrowLeft");
        const events = await evaluate("window.events");
        assert.deepEqual(
          events.map((e) => e[0]),
          ["change", "commit"],
        );
        assert.equal(events[0][1], events[1][1]);
        assert.equal(events[0][1], events[0][2]);
        if (lib === "vpm") {
          await key("End");
          await wait("Number(input.value)===20.8");
          await key("Home");
          await wait("Number(input.value)===11.2");
          await evaluate("window.draw({},false,true);input.focus()");
          await key("ArrowLeft");
          await wait("Number(input.value)===12.8");
          await evaluate("window.draw({disabled:true});window.events.length=0");
          await mouse("mousePressed", x + w / 2, y, 1);
          await mouse("mouseReleased", x + w / 2, y);
          assert.deepEqual(await evaluate("window.events"), []);
        }
      }
    // Keep emulated touch gestures out of the mouse phase across navigation.
    for (const version of ["app", "current"]) {
      const variant = version + "-vpm";
      await send("Page.navigate", { url: baseUrl + variant });
      await wait("location.pathname==='/" + variant + "' && window.draw");
      await evaluate(
        "window.draw({});window.track=document.querySelector('.MuiSlider-root');true",
      );
      await send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
      });
      await evaluate("window.events.length=0");
      const [tx, ty] = await evaluate(
        "(()=>{const b=track.getBoundingClientRect();return [b.x+b.width*.83,b.y+b.height/2]})()",
      );
      await send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: tx, y: ty }],
      });
      await wait("track.classList.contains('MuiSlider-dragging')");
      await send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      await wait("!track.classList.contains('MuiSlider-dragging')");
      assert.ok(
        await evaluate(
          "events.some(e=>e[0]==='change') && !events.some(e=>e[0]==='commit')",
        ),
      );
      await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    }
    console.log(
      "Both toolbar controls passed keyboard and drag comparisons; VPM also applies the current keyboard value to the document.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

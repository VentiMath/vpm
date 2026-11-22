"use strict";
const assert = require("node:assert/strict");
const metrics = `(()=>{const all=s=>[...document.querySelectorAll(s)];const style=(s,k)=>getComputedStyle(document.querySelector(s))[k];
return {labels:all('.MuiStepLabel-label').map(e=>e.textContent),active:all('.MuiStepLabel-label.Mui-active').map(e=>e.textContent),completed:all('.MuiStep-root.Mui-completed').length,disabled:all('.MuiStepLabel-root.Mui-disabled').length,connectors:all('.MuiStepConnector-root').length,
icons:all('.MuiStepIcon-root').map(e=>[e.textContent,e.getAttribute('aria-hidden')]),textSize:style('.MuiStepIcon-text','fontSize'),top:style('.MuiStepConnector-root','top'),gap:style('.MuiStepper-root','marginBottom'),activeColor:style('.MuiStepLabel-label.Mui-active','color'),line:style('.MuiStepConnector-line','borderTopColor'),positions:all('.MuiStepIcon-root').map(e=>{const b=e.getBoundingClientRect();return Math.round(b.x+b.width/2);}),labelOffset:Math.round(document.querySelector('.MuiStepLabel-label').getBoundingClientRect().top-document.querySelector('.MuiStepIcon-root').getBoundingClientRect().bottom)};})()`;
require("./compare-scenes.cjs")(
  "steps",
  async ({ send, evaluate, wait, settle, baseUrl }) => {
    for (const version of ["current", "app"]) {
      const snapshots = [];
      for (const lib of ["upstream", "vpm"]) {
        const variant = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + variant });
        await wait("location.pathname==='/" + variant + "' && window.draw");
        if (process.env.VPM_APP_CHECKOUT)
          await evaluate(
            require("./app-registration-steps.cjs")(
              process.env.VPM_APP_CHECKOUT,
              process.env.VPM_APP_REF,
            ),
          );
        let index = 0;
        for (const [role, step, width, dir] of [
          ["student", 0, 900, "ltr"],
          ["student", 1, 900, "ltr"],
          ["parent", 3, 900, "ltr"],
          ["volunteer", 2, 450, "ltr"],
          ["other", 0, 450, "rtl"],
          ["parent", 1, 900, "rtl"],
        ]) {
          await send("Emulation.setDeviceMetricsOverride", {
            width,
            height: 600,
            deviceScaleFactor: 1,
            mobile: false,
          });
          await evaluate(
            "document.documentElement.dir=" +
              JSON.stringify(dir) +
              ";window.draw(" +
              JSON.stringify(role) +
              "," +
              step +
              ",true);true",
          );
          if (index === 0)
            await evaluate(
              "window.first=document.querySelector('.MuiStep-root');window.next=document.querySelector('button');next.focus();true",
            );
          await evaluate(settle);
          const state = await evaluate(metrics);
          assert.equal(state.completed, step);
          assert.equal(state.connectors, state.labels.length - 1);
          assert.deepEqual(state.active, [state.labels[step]]);
          assert.ok(
            await evaluate(
              "document.activeElement===next && first===document.querySelector('.MuiStep-root')",
            ),
          );
          assert.equal(state.textSize, "14px", variant);
          assert.equal(state.gap, "24px");
          if (lib === "upstream") snapshots.push(state);
          else {
            assert.equal(
              await evaluate(
                "document.querySelector('[aria-current=step] .MuiStepLabel-label').textContent",
              ),
              state.active[0],
            );
            assert.equal(
              await evaluate(
                "document.querySelectorAll('ol > li.MuiStep-root').length",
              ),
              state.labels.length,
            );
            const expected = snapshots[index];
            const { positions, ...presentation } = state;
            const { positions: control, ...baseline } = expected;
            assert.deepEqual(
              presentation,
              baseline,
              variant + " " + role + " " + step,
            );
            for (let i = 0; i < control.length; i++)
              assert.ok(
                Math.abs(positions[i] - control[i]) <= 1,
                "Icon position differs at " +
                  i +
                  ": " +
                  positions +
                  " vs " +
                  control,
              );
          }
          index++;
        }
      }
    }
    console.log(
      "WARML role changes, navigation, retained label nodes and focus, theme geometry, RTL and accessible current step passed in Chrome.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

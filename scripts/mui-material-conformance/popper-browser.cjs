"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "popper",
  async ({ send, evaluate, wait, baseUrl }) => {
    for (const version of ["app", "current"])
      for (const lib of ["upstream", "vpm"]) {
        const variant = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + variant });
        await wait("location.pathname === '/" + variant + "' && window.draw");
        if (process.env.VPM_APP_CHECKOUT)
          await evaluate(
            require("./app-search-popper.cjs")(
              process.env.VPM_APP_CHECKOUT,
              process.env.VPM_APP_REF,
            ),
          );
        for (const index of [0, 1]) {
          await evaluate(
            "window.anchor.style.top='60px';window.draw('result'," +
              index +
              ");window.anchor.focus()",
          );
          await wait(
            "window.bounds()?.side==='bottom' && Math.abs(window.bounds().below)<1 && Math.abs(window.bounds().dx)<1",
          );
          assert.equal(
            await evaluate(
              "document.querySelector('.MuiPopper-root').parentNode===document.body && !!document.querySelector('.z-9999 [role=option]')",
            ),
            true,
          );
          await evaluate(
            "window.firstPanel=document.querySelector('.MuiPopper-root');window.draw('empty'," +
              index +
              ")",
          );
          assert.equal(
            await evaluate(
              "window.firstPanel===document.querySelector('.MuiPopper-root') && firstPanel.textContent==='No results' && document.activeElement===window.anchor",
            ),
            true,
          );
          await evaluate(
            "window.anchor.style.top=(innerHeight-35)+'px';window.dispatchEvent(new Event('resize'))",
          );
          await wait(
            "window.bounds()?.side==='top' && Math.abs(window.bounds().above)<1",
          );
          await evaluate(
            "window.draw('closed'," +
              index +
              ");window.dispatchEvent(new Event('resize'))",
          );
          assert.equal(await evaluate("window.bounds()"), null);
        }
        await evaluate("window.originalPanels=undefined;anchor.style.top=(innerHeight-110)+'px';draw('result')");
        await wait("window.bounds()?.side==='bottom' && Math.abs(window.bounds().below)<1");
        if (lib === "vpm") {
          // Grow the open list without a React render or window resize.
          await evaluate("document.querySelector('[role=listbox]').style.height='150px'");
          await wait("window.bounds()?.side==='top' && Math.abs(window.bounds().above)<1");
        }
        await evaluate(`window.draw('closed');
     const viewport=document.createElement('div'),content=document.createElement('div');
     viewport.style.cssText='position:absolute;top:40px;width:360px;height:120px;overflow:auto';
     content.style.cssText='position:relative;height:500px';document.body.append(viewport);
     viewport.append(content);content.append(anchor);anchor.style.top='60px';window.viewport=viewport;draw('result');`);
        await wait(
          "window.bounds()?.side==='bottom' && Math.abs(window.bounds().below)<1",
        );
        await evaluate("viewport.scrollTop=35");
        await wait("Math.abs(window.bounds().below)<1");
        await evaluate(
          "window.draw('result',0,{keepMounted:true});window.cachedPanel=document.querySelector('.MuiPopper-root');window.draw('closed',0,{keepMounted:true})",
        );
        assert.equal(
          await evaluate(
            "cachedPanel.isConnected && getComputedStyle(cachedPanel).display==='none'",
          ),
          true,
        );
        await evaluate("window.draw('result',0,{keepMounted:true})");
        await wait(
          "document.querySelector('.MuiPopper-root')===cachedPanel && Math.abs(window.bounds().below)<1",
        );
        await evaluate(`window.draw('closed');window.testFrame=document.createElement('iframe');document.body.append(testFrame);
     window.innerAnchor=testFrame.contentDocument.createElement('button');innerAnchor.textContent='Find';testFrame.contentDocument.body.append(innerAnchor);
     window.draw('result',0,{anchorEl:()=>innerAnchor});`);
        await wait(
          "testFrame.contentDocument.querySelector('.MuiPopper-root')?.dataset.popperPlacement",
        );
        assert.equal(
          await evaluate("document.querySelector('.MuiPopper-root')===null"),
          true,
        );
        await evaluate("window.draw('closed');testFrame.remove()");
      }
    console.log(
      "Both Material controls and VPM position search results, retain focus for empty results, flip at the viewport edge and remove the portal on close.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

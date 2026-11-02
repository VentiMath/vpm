"use strict";
const { useEffect } = require("react");
const { getNonce } = require("vget-nonce");

function stylesheetSingleton() {
  let users = 0;
  let element;
  return {
    add(css) {
      if (users) {
        users++;
        return;
      }
      // A server call does not acquire a browser stylesheet or a reference.
      if (typeof document === "undefined" || !document.head) return;
      const next = document.createElement("style");
      next.type = "text/css";
      const nonce = getNonce();
      if (nonce) next.setAttribute("nonce", nonce);
      next.textContent = css;
      // Publish ownership only after insertion succeeds.
      document.head.appendChild(next);
      element = next;
      users = 1;
    },
    remove() {
      if (!users || --users) return;
      element.remove();
      element = undefined;
    },
  };
}

function styleHookSingleton() {
  const sheet = stylesheetSingleton();
  return function useStyles(styles, dynamic = false) {
    useEffect(() => {
      sheet.add(styles);
      return () => sheet.remove();
    }, [Boolean(dynamic), dynamic ? styles : null]);
  };
}

function styleSingleton() {
  const useStyles = styleHookSingleton();
  return function Style({ styles, dynamic }) {
    useStyles(styles, dynamic);
    return null;
  };
}

exports.stylesheetSingleton = stylesheetSingleton;
exports.styleHookSingleton = styleHookSingleton;
exports.styleSingleton = styleSingleton;

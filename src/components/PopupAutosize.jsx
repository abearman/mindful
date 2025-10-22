import { useEffect, useRef } from "react";

/**
 * Chrome action popups sometimes won't shrink when content gets shorter.
 * This forces a re-measure by setting an explicit px height on <html>/<body>
 * and triggering a reflow whenever the observed node changes size.
 */
export default function PopupAutosize({
  selector = ".popup-root",
  maxH = 600,           // Chrome popup hard cap is ~600px
  minH = 0              // let it collapse fully
}) {
  const ro = useRef(null);

  useEffect(() => {
    const target = document.querySelector(selector);
    if (!target) return;

    const html = document.documentElement;
    const body = document.body;

    const apply = () => {
      const h = Math.max(minH, Math.min(Math.ceil(target.getBoundingClientRect().height), maxH));

      // lock to explicit px height so Chrome shrinks the window
      html.style.height = `${h}px`;
      body.style.height = `${h}px`;
      html.style.maxHeight = `${h}px`;
      body.style.maxHeight = `${h}px`;
      body.style.overflow = "hidden"; // avoid inner scrollbars that mask height changes

      // force a layout pass so Chrome re-evaluates popup size
      // (toggling a non-visible property is enough)
      body.style.willChange = "transform";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      body.offsetHeight; // reflow
      body.style.willChange = "auto";
    };

    // initial measure
    apply();

    // resize observer for dynamic changes (tab switch, validation text, etc.)
    if (typeof ResizeObserver !== 'function') return;
    ro.current = new ResizeObserver(() => requestAnimationFrame(apply));
    ro.current.observe(target);

    // also listen for clicks on the Amplify tabs to run *after* panel swap
    const clickHandler = (e) => {
      if (e.target.closest?.(".amplify-tabs__item")) {
        setTimeout(apply, 0);
      }
    };
    target.addEventListener("click", clickHandler);

    return () => {
      ro.current?.disconnect();
      target.removeEventListener("click", clickHandler);
    };
  }, [selector, maxH, minH]);

  return null;
}

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/** Fades + lifts children marked with [data-reveal] as they enter the viewport. */
export function useReveal<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const scope = useRef<T | null>(null);

  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      targets.forEach((t) => {
        gsap.fromTo(
          t,
          { autoAlpha: 0, y: 26 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: t, start: "top 88%", once: true },
          },
        );
      });
      ScrollTrigger.refresh();
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}

/** Counts a number up smoothly. */
export function useCountUp(value: number, active = true) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const obj = { v: 0 };
    const tw = gsap.to(obj, {
      v: value,
      duration: 1.4,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(obj.v));
      },
    });
    return () => {
      tw.kill();
    };
  }, [value, active]);
  return ref;
}

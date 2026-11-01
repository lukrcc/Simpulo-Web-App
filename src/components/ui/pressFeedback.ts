/** The "pressed" class comes off after this (the press itself is 120ms – see .press-feedback in globals.css). */
const PRESSED_MS = 140;

/** Presses a button with .press-feedback in for a moment (card share and heart buttons; none with reduced motion). */
export function pressFeedback(el: HTMLElement) {
  el.classList.add("pressed");
  window.setTimeout(() => el.classList.remove("pressed"), PRESSED_MS);
}

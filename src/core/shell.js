/**
 * Registry for the persistent shell components.
 *
 * The robot and narrator live outside the router's outlet and outlive every view, but
 * views still need to talk to them — a hub asks the narrator to introduce it. Passing
 * them down through render context would thread them through every view signature for
 * the benefit of the two that care.
 *
 * main.js owns construction and calls setShell(). Views read. Nothing else writes.
 */

/** @type {import('../components/robot.js').Robot | null} */
let robot = null;

/** @type {import('../components/narrator.js').Narrator | null} */
let narrator = null;

/**
 * @param {{ robot?: any, narrator?: any }} parts
 */
export function setShell(parts) {
  if (parts.robot) robot = parts.robot;
  if (parts.narrator) narrator = parts.narrator;
}

/** May be null if a view renders before the shell is built — callers must cope. */
export function getRobot() {
  return robot;
}

export function getNarrator() {
  return narrator;
}

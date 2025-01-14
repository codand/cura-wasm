/**
 * @fileoverview Cura WASM types
 */

/**
 * Override type
 */
export interface override
{
  /**
   * The scope of the override
   *
   * If set to `undefined`, the override will apply to all extruders
   *
   * If set to a valid string `e<Number>` (`e0`, `e1`, `e2`, etc.),
   * the override will apply to the corresponding extruder. Counting is
   * zero based, so the first extruder is `e0`
   */
  scope: string,

  /**
   * The property to override
   */
  key: string,

  /**
   * The value to override with
   */
  value: string
}

export interface Metadata
{
  flavor: string,
  printTime: number,
  material1Usage: number,
  material2Usage: number,
  nozzleSize: number,
  filamentUsage: number,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number
}
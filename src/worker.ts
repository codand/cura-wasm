/**
 * @fileoverview Cura WASM Worker
 */

//Imports
import {convert} from './file';
import {expose, Transfer, TransferDescriptor} from 'threads';
import {generate} from './arguments';
import {Observable} from 'observable-fns';
import {Observer} from 'observable-fns/dist/observable';
import {Metadata, override} from './types';
import CuraEngine from './CuraEngine.js';
import definitions from './definitions/index';
import type {CombinedDefinition} from 'cura-wasm-definitions/src/types';

/**
 * `EmscriptenModule` with a few tweaks
 */
interface EmscriptenModule2 extends EmscriptenModule
{
  callMain(args: string[]): void,
  FS: typeof FS
}

//Instance variables
let engine = null as EmscriptenModule2 | null;
let extruderCount = null as number | null;
let progressObserver = null as Observer<any> | null;
let metadataObserver = null as Observer<any> | null;

/**
 * Cura WASM's low-level singleton for interfacing with Cura Engine
 */
const worker = {
  /**
   * Initialize the emscripten module
   * @param verbose Wether to enable verbose logging (Useful for debugging)
   */
  async initialize(verbose: boolean = false): Promise<void>
  {
    //Emscripten config
    const config: Partial<EmscriptenModule2> = {
      noInitialRun: true,
      print: undefined,
      printErr: undefined
    };

    if (!verbose)
    {
      config.print = () => null;
      config.printErr = () => null;
    }

    //Bootstrap CuraEngine
    engine = await CuraEngine(config);
  },

  /**
   * Add 3D printer definition files to the virtual filesystem
   * @param definition The printer definition
   */
  async addDefinitions(definition: CombinedDefinition): Promise<void>
  {
    //Type guard
    if (engine == null)
    {
      throw new Error('Attempting to add definitions before initialization!');
    }

    engine.FS.mkdir('/definitions');

    //Add primary definitions
    for (const rawDefinition in definitions)
    {
      //Cast raw definition type
      const definition = <keyof typeof definitions>rawDefinition;

      const path = `/definitions/${definition}.def.json`;

      //Copy file to memory filesystem
      engine.FS.writeFile(path, JSON.stringify(definitions[definition]));
    }

    //Add secondary definition
    engine.FS.writeFile('/definitions/printer.def.json', JSON.stringify(definition.printer));

    for (const [i, extruder] of definition.extruders.entries())
    {
      engine.FS.writeFile(`/definitions/extruder-${i}.def.json`, JSON.stringify(extruder));
    }

    //Store extruder count for removal, later
    extruderCount = definition.extruders.length;
  },

  /**
   * Observe slice progress
   */
  observeProgress: () => new Observable(observer =>
  {
    progressObserver = observer;
  }),

  /**
   * Observe slice metadata
   */
  observeMetadata: () => new Observable(observer =>
  {
    metadataObserver = observer;
  }),

  /**
   * Run Cura
   * @param command The Cura Engine launch command
   * @param overrides Cura overrides
   * @param verbose Wether or not to enable verbose logging in Cura
   * @param file The file
   * @param extension The file extension
   * @param progress The progress event handler
   */
  async run(command: string | null, overrides: override[] | null, verbose: boolean | null, file: ArrayBuffer, extension: string): Promise<TransferDescriptor | Error>
  {
    //Type guard
    if (engine == null)
    {
      throw new Error('Attempting to run Cura Engine before initialization!');
    }

    /**
     * The bias of the file converter progress (Range: 0-1)
     * 
     * A higher value indicates more time is usually taken
     * by the file converter and less time by the slicer
     */
    const converterBias = extension == 'stl' ? 0 : 0.3;

    /**
     * The bias of the slicer progress
     * 
     * Percent inverse of the file converter bias
     */
    const slicerBias = 1 - converterBias;

    //Convert the file to an STL
    const stl = await convert(file, extension, converterProgress =>
    {
      //Emit progress
      if (progressObserver != null &&
        progressObserver.next != null)
      {
        progressObserver.next(converterProgress * converterBias);
      }
    });

    //Handle errors
    if (stl instanceof Error)
    {
      return stl;
    }
    else
    {
      //Write the file
      engine.FS.writeFile('Model.stl', stl);

      let previousSlicerProgress = 0;

      //@ts-ignore Register the progress handler (The globalThis context is hard coded into Cura; you'll have to recompile it to change this)
      globalThis['cura-wasm-progress-callback'] = (slicerProgress: number) =>
      {
        //Round the slicer progress
        slicerProgress = Math.round(100 * slicerProgress) / 100;

        if (slicerProgress != previousSlicerProgress)
        {
          //Emit progress
          if (progressObserver != null &&
            progressObserver.next != null)
          {
            progressObserver.next((slicerProgress * slicerBias) + converterBias);
          }

          previousSlicerProgress = slicerProgress;
        }
      };

      //@ts-ignore Register the metadata handler (The globalThis context is hard coded into Cura; you'll have to recompile it to change this)
      globalThis['cura-wasm-metadata-callback'] = (
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
      ) =>
      {
        //Emit metadata
        if (metadataObserver != null &&
          metadataObserver.next != null)
        {
          metadataObserver.next({
            flavor,
            printTime,
            material1Usage,
            material2Usage,
            nozzleSize,
            filamentUsage,
            minX,
            minY,
            minZ,
            maxX,
            maxY,
            maxZ,
          } as Metadata);
        }
      };

      //Generate CLI arguments
      const args = command == null ? generate(overrides, verbose) : command.split(' ');

      //Log
      if (verbose)
      {
        console.log(`Calling Cura Engine with ${args.join(' ')}`);
      }

      //Run Cura (Blocking)
      engine.callMain(args);

      //@ts-ignore Delete the progress handler
      delete globalThis['cura-wasm-progress-callback'];

      //Read the file (Uint8Array) and convert to an ArrayBuffer
      const gcode = engine.FS.readFile('Model.gcode').buffer;

      //Remove the files
      engine.FS.unlink('Model.stl');
      engine.FS.unlink('Model.gcode');

      //Return a ThreadJS transferable (ArrayBuffer)
      return Transfer(gcode);
    }
  },

  /**
   * Remove the 3D printer definition files from the virtual file system
   */
  async removeDefinitions(): Promise<void>
  {
    //Type guard
    if (engine == null || extruderCount == null)
    {
      throw new Error('Attempting to remove definitions before initialization!');
    }

    //Remove primary definitions
    for (const rawDefinition in definitions)
    {
      //Cast raw definition type
      const definition = <keyof typeof definitions>rawDefinition;

      const path = `/definitions/${definition}.def.json`;

      //Copy file to memory filesystem
      engine.FS.unlink(path);
    }

    //Remove secondary definition
    engine.FS.unlink('/definitions/printer.def.json');

    for (let i = 0; i < extruderCount; i++)
    {
      engine.FS.unlink(`/definitions/extruder-${i}.def.json`);
    }

    engine.FS.rmdir('/definitions');
  }
};

//Export
expose(worker);
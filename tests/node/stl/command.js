/**
 * @fileoverview Command Cura WASM Tests
 */

//Imports
const {CuraWASM} = require('../../../dist/cjs');
const {expect} = require('chai');
const {hash, saveFiles} = require('../utils');
const {resolveDefinition} = require('cura-wasm-definitions');
const fs = require('fs');

//Get the file
const file = fs.readFileSync('./demo/benchy.stl').buffer;

//Export
module.exports = () =>
{
  it('will slice the file via a launch command', async () =>
  {
    const slicer = new CuraWASM({
      command: 'slice -j definitions/printer.def.json -l Model.stl -o Model.gcode',
      definition: resolveDefinition('ultimaker2')
    });

    const {gcode, metadata} = await slicer.slice(file, 'stl');

    //Optionally save
    if (saveFiles)
    {
      fs.writeFileSync('./stl-command.gcode', new Uint8Array(gcode));
    }

    expect(file.byteLength).to.be.equal(0);

    expect(hash(gcode)).to.equal('2efc815ef0871a5aa0c0b4b09b4009ac3ace2fe37a48a366e4d06e0c5563a619');

    expect(metadata).to.eql({
      flavor: 'UltiGCode',
      printTime: 9061,
      material1Usage: 11172,
      material2Usage: 0,
      nozzleSize: 0.4,
      filamentUsage: 11172,
      maxX: 142.112,
      maxY: 127.435,
      maxZ: 48,
      minX: 78.628,
      minY: 95.565,
      minZ: 0.3,
    });

    await slicer.destroy();
  });
};
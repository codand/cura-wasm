/**
 * @fileoverview Clone Cura WASM Tests
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
  it('will slice the file via cloning the ArrayBuffer', async () =>
  {
    const slicer = new CuraWASM({
      definition: resolveDefinition('ultimaker2'),
      transfer: false
    });

    const gcode = await slicer.slice(file, 'stl');

    //Optionally save
    if (saveFiles)
    {
      fs.writeFileSync('./stl-clone.gcode', new Uint8Array(gcode));
    }

    expect(file.byteLength).to.be.greaterThan(0);

    expect(hash(gcode)).to.equal('e7f1d0a866ffc6ce9294d5c1a659430577a797ed891497a2637f0389a557c7ec');

    await slicer.destroy();
  });
};
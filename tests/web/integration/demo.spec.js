///<reference types="cypress"/>
/**
 * @fileoverview Cypress Browser Tests
 */

/**
 * Handle gcode output and verify its hash
 * @param {string} referenceHash The reference hash to compare the outputted file against
 * @param {object} referenceMetadata The reference metadata to compare the outputted metadata agains
 * @param {Function} done Mocha done callback
 */
const handleFinish = (referenceHash, referenceMetadata, done) => async (gcode, metadata) =>
{
  expect(gcode.byteLength).to.be.greaterThan(0);

  expect(await hash(gcode)).to.equal(referenceHash);

  expect(metadata).to.eql(referenceMetadata);

  done();
};

/**
 * Hash raw using the specified algorithm
 * @param {ArrayBuffer} raw
 * @param {string} algorithm
 */
const hash = async (raw, algorithm = 'sha-256') =>
{
  const digest = await crypto.subtle.digest(algorithm, raw);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

describe('cura wasm', () =>
{
  beforeEach(() =>
  {
    cy.visit('/');
  });

  describe('stl', () =>
  {
    beforeEach(() =>
    {
      //Mocks
      cy.window().then(window =>
      {
        //File upload
        window.getFile = async () =>
        {
          const res = await fetch('/benchy.stl');

          const bytes = await res.arrayBuffer();

          return {
            arrayBuffer: () => bytes,
            name: 'benchy.stl'
          };
        };
      });
    });

    it('will display all required UI elements', () =>
    {
      cy.get('#upload').should('be.visible');
      cy.get('#slice').should('be.visible');
      cy.get('#progress').should('be.visible');
      cy.get('#percent').should('be.visible');
      cy.get('#metadata').should('be.visible');
      cy.get('#download').should('be.visible');
    });

    it('will slice the file via transfering the ArrayBuffer', done =>
    {
      //Mocks
      cy.window().then(window =>
      {
        window.handleFinish = handleFinish('2efc815ef0871a5aa0c0b4b09b4009ac3ace2fe37a48a366e4d06e0c5563a619', {
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
        }, done);

        //Slice
        cy.get('#slice').click();
        cy.progressIncreases('#percent');
        cy.get('#download').click();
      });

      cy.window().then(window =>
      {
        expect(window.afterFile.byteLength).to.equal(0);
      });
    });

    it('will slice the file via a launch command', done =>
    {
      //Mocks
      cy.window().then(window =>
      {
        window.command = 'slice -j definitions/printer.def.json -l Model.stl -o Model.gcode';

        window.handleFinish = handleFinish('2efc815ef0871a5aa0c0b4b09b4009ac3ace2fe37a48a366e4d06e0c5563a619', {
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
        }, done);

        //Slice
        cy.get('#slice').click();
        cy.progressIncreases('#percent');
        cy.get('#download').click();
      });

      cy.window().then(window =>
      {
        expect(window.afterFile.byteLength).to.equal(0);
      });
    });

    it('will slice the file via cloning the ArrayBuffer', done =>
    {
      //Mocks
      cy.window().then(window =>
      {
        //Clone the file
        window.transferFile = false;

        window.handleFinish = handleFinish('2efc815ef0871a5aa0c0b4b09b4009ac3ace2fe37a48a366e4d06e0c5563a619', {
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
        }, done);

        //Slice
        cy.get('#slice').click();
        cy.progressIncreases('#percent');
        cy.get('#download').click();
      });

      cy.window().then(window =>
      {
        expect(window.afterFile.byteLength).to.be.greaterThan(0);
      });
    });

    it('will slice the file via transfering the ArrayBuffer with overrides', done =>
    {
      //Mocks
      cy.window().then(window =>
      {
        window.handleFinish = handleFinish('d7e8d30ac5e50aba611403b3c88e46fc05c0404ed317e752285bf0bf6502ab28', {
          flavor: 'UltiGCode',
          printTime: 5285,
          material1Usage: 12315,
          material2Usage: 0,
          nozzleSize: 0.4,
          filamentUsage: 12315,
          maxX: 162.108,
          maxY: 127.435,
          maxZ: 47.9,
          minX: 98.628,
          minY: 95.399,
          minZ: 0.3,
        }, done);

        window.overrides = [
          {
            key: 'mesh_position_x',
            value: '20'
          },
          {
            key: 'layer_height',
            value: '0.2'
          }
        ];

        //Slice
        cy.get('#slice').click();
        cy.progressIncreases('#percent');
        cy.get('#download').click();
      });

      cy.window().then(window =>
      {
        expect(window.afterFile.byteLength).to.equal(0);
      });
    });
  });

  describe('3mf', () =>
  {
    beforeEach(() =>
    {
      //Mocks
      cy.window().then(window =>
      {
        //File upload
        window.getFile = async () =>
        {
          const res = await fetch('/benchy.3mf');

          const bytes = await res.arrayBuffer();

          return {
            arrayBuffer: () => bytes,
            name: 'benchy.3mf'
          };
        };
      });
    });

    it('will slice the file via transfering the ArrayBuffer', done =>
    {
      //Mocks
      cy.window().then(window =>
      {
        window.handleFinish = handleFinish('44fc9aa6556c6504ff8bf83b553ee684e1fd7de1ec7f549fd75acebcdaf146fb', {
          flavor: 'UltiGCode',
          printTime: 9064,
          material1Usage: 11172,
          material2Usage: 0,
          nozzleSize: 0.4,
          filamentUsage: 11172,
          maxX: 142.112,
          maxY: 127.434,
          maxZ: 48,
          minX: 78.628,
          minY: 95.565,
          minZ: 0.3,
        }, done);

        //Slice
        cy.get('#slice').click();
        cy.progressIncreases('#percent');
        cy.get('#download').click();
      });

      cy.window().then(window =>
      {
        expect(window.afterFile.byteLength).to.equal(0);
      });
    });
  });
});
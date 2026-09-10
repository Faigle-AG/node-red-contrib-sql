const assert = require('assert/strict');
const helper = require('node-red-node-test-helper');
const templateNode = require('../src/_template_.js');

helper.init(require.resolve('node-red'));

describe('example-template Node', function () {
    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should load correctly with the given name', function (done) {
        const flow = [{ id: 'n1', type: '_template_', name: 'my template' }];

        helper.load(templateNode, flow, function () {
            const n1 = helper.getNode('n1');
            assert.equal(n1.name, 'my template');
            done();
        });
    });

    it('should stringify the input, prepend a prefix, and write to the output property', function (done) {
        const flow = [
            {
                id: 'n1',
                type: '_template_',
                exampleIn: 'payload',
                exampleInType: 'msg',
                exampleOut: 'formattedValue',
                exampleOutType: 'msg',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load(templateNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n1.on('call:error', function (call) {
                done(call.firstArg);
            });

            n2.on('input', function (msg) {
                try {
                    assert.equal(msg.payload, 'test value');
                    assert.equal(msg.formattedValue, 'Input : "test value"');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: 'test value' });
        });
    });

    it('should handle object payloads correctly', function (done) {
        const flow = [
            {
                id: 'n1',
                type: '_template_',
                exampleIn: 'payload',
                exampleInType: 'msg',
                exampleOut: 'formattedValue',
                exampleOutType: 'msg',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load(templateNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n1.on('call:error', function (call) {
                done(call.firstArg);
            });

            n2.on('input', function (msg) {
                try {
                    assert.equal(msg.formattedValue, 'Input : {"key":"value"}');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: { key: 'value' } });
        });
    });
});

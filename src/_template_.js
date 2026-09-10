module.exports = function (RED) {
    const { extendNode } = require('@faigle/node-red-runtime-utils')(RED);

    function ExampleTemplateNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.enableLogging = config.enableLogging;
        this.exampleIn = config.exampleIn;
        this.exampleInType = config.exampleInType;
        this.exampleOut = config.exampleOut;
        this.exampleOutType = config.exampleOutType;

        var node = this;

        extendNode(node);

        node.on('input', async function (msg, send, done) {
            try {
                node.status.processing('processing message');

                if (node.enableLogging)
                    node.log('Received payload: ' + JSON.stringify(msg.payload));

                const input = await node.getTypedProperty(node.exampleIn, node.exampleInType, msg);
                const output = 'Input : ' + JSON.stringify(input);
                await node.setTypedProperty(node.exampleOut, node.exampleOutType, msg, output);

                send(msg);

                if (done) done();

                node.status.succeeded('finished processing', {
                    next: () => node.status.waiting('waiting for input'),
                });
            } catch (err) {
                node.error(err);
                node.status.failed(err.code || err.message || 'Configuration error');
                if (done) done(err);
                else node.error(err, msg);
            }
        });
    }

    RED.nodes.registerType('_template_', ExampleTemplateNode);
};

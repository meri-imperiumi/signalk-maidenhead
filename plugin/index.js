let WGS84ToMaidenhead;

module.exports = (app) => {
  const plugin = {};
  let unsubscribes = [];
  plugin.id = 'signalk-maidenhead';
  plugin.name = 'Maidenhead Locator';
  plugin.description = 'Produce a Maidenhead Locator System position string';

  import('@hamset/maidenhead-locator')
    .then((lib) => {
      WGS84ToMaidenhead = lib.WGS84ToMaidenhead;
    })
    .catch((e) => {
      app.setPluginError(`Failed to load library: ${e.message}`);
    });

  plugin.start = () => {
    app.subscriptionmanager.subscribe(
      {
        context: 'self',
        subscribe: [
          {
            path: 'navigation.position',
            period: 5000,
          },
        ],
      },
      unsubscribes,
      (subscriptionError) => {
        app.error(subscriptionError);
      },
      (delta) => {
        if (!delta.updates) {
          return;
        }
        // Record inputs
        delta.updates.forEach((u) => {
          if (!u.values) {
            return;
          }
          u.values.forEach((v) => {
            // TODO: Produce Maidenhead
            if (v.path !== 'navigation.position') {
              return;
            }
            if (!WGS84ToMaidenhead) {
              return;
            }
            const maidenhead = WGS84ToMaidenhead({
              lat: v.value.latitude,
              lng: v.value.longitude,
            });
            app.setPluginStatus(`QTH calculated as ${maidenhead}`);
            app.handleMessage(plugin.id, {
              context: `vessels.${app.selfId}`,
              updates: [
                {
                  source: {
                    label: plugin.id,
                  },
                  timestamp: (new Date().toISOString()),
                  values: [
                    {
                      path: 'communication.qth',
                      value: maidenhead,
                    },
                  ],
                },
              ],
            });
          });
        });
      },
    );
  };

  plugin.stop = () => {
    unsubscribes.forEach((f) => f());
    unsubscribes = [];
  };

  plugin.schema = {};

  return plugin;
};

const Joi = require('joi');
const Boom = require('boom');
const insight = require('../utils/insight.js');

const { getMappingFiles } = require('../../scripts/update-mapping-files.js');

exports.register = async (server, options, next) => {
  const mappingFiles = await getMappingFiles();
  const flatMappingList = Object.assign(...Object.values(mappingFiles));

  server.route([{
    path: '/q/java/{package*}',
    method: 'GET',
    config: {
      validate: {
        params: {
          package: Joi.required(),
        },
      },
      handler: async (request, reply) => {
        const pkg = request.params.package;
        const eventData = {
          registry: 'java',
          package: pkg,
          referer: request.headers.referer,
        };

        const url = flatMappingList[pkg];

        if (url) {
          eventData.url = url;
          insight.trackEvent('resolved', eventData, request);

          reply({
            url,
          });
          return;
        }

        const err = Boom.notFound('Library not found', {
          eventKey: 'library_not_found',
        });

        insight.trackError(err.eventKey, err, eventData, request);
        reply(err);
      },
    },
  }]);

  next();
};

exports.register.attributes = {
  pkg: {
    name: 'Java Resolver',
    version: '1.0.0',
  },
};

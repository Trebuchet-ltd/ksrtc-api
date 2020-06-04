'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

      /**
   * Retrieve a deeply populated record.
   *
   * @return {Object}
   */

  async getOneDeep(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services.template.findOne({ id }, {
        path: 'route',
        populate: [{
            path: 'stops'
        },
        {
            path: 'from'
        },
        {
            path: 'to'
        }
        ]
    });
    return sanitizeEntity(entity, { model: strapi.models.template });
  },


    /**
 * Retrieve records.
 *
 * @return {Array}
 */

    async getDeep(ctx) {
        if (ctx.query._q) {
            return strapi.services.template.search(ctx.query);
        }
        return strapi.services.template.find(ctx.query, {
            path: 'route',
            populate: [{
                path: 'stops'
            },
            {
                path: 'from'
            },
            {
                path: 'to'
            }
            ]
        });
    },
};

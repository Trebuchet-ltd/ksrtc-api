'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

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
            populate: {
                path: 'stops'
            }
        });
    },
};

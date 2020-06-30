'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');


function handleError(ctx, error, status = 500, message = 'Internal Server Error') {
    ctx.response.status = status;
    console.log('Error Object:', error);
    console.log('Message:', message);
    let error_pack = {
        status: status,
        message: message
    }
    return error_pack;
}


module.exports = {
    /**
     * Create a record.
     *
     * @return {Object}
     */

    async create(ctx) {

        let duplicate = await strapi.query('hub').findOne(ctx.request.body);

        if (duplicate)
            return handleError(ctx, null, 409, 'Hub already Exists.');

        let entity = await strapi.services.hub.create(ctx.request.body);

        return sanitizeEntity(entity, { model: strapi.models.hub });
    },
};
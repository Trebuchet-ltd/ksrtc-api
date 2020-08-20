'use strict';

var _ = require('lodash');

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');


function keyInObj(k, obj) {
    return (k in obj) && (obj[k] != null) && (obj[k] !== '')
}

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

function validateRequiredFields(fields, obj) {
    let res = null;
    fields.forEach(field => {
        if (!keyInObj(field, obj)) {
            console.log(field)
            res = field
        }
    });
    return res;
}



module.exports = {
    /**
     * Return hubs district-wise.
     *
     * @return {Object}
     */

    async districts(ctx) {

        let hubs = await strapi.query('hub').find(ctx.query);

        var grouped = _.groupBy(hubs, 'district');

        return grouped;
    },


    /**
     * Create a record.
     *
     * @return {Object}
     */

    async create(ctx) {

        const required = ['name', 'isHub']

        const missingField = validateRequiredFields(required, ctx.request.body);
        if (missingField != null) {
            return handleError(ctx, null, 400, "Missing value for one or more required field(s). Missing field: " + missingField)
        }

        // TODO: handle case where req body is empty

        let duplicate = await strapi.query('hub').findOne(ctx.request.body);

        if (duplicate)
            return handleError(ctx, null, 409, 'Hub already Exists.');


        let entity
        try {
            entity = await strapi.services.hub.create(ctx.request.body);
        } catch (error) {
            if (error.name === 'ValidationError') {
                console.log("Validaation error")
                return handleError(ctx, null, 400, "Validation Error.")
            }
            throw (error)
        }

        return sanitizeEntity(entity, { model: strapi.models.hub });
    },
};
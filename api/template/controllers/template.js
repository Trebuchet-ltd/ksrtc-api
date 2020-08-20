'use strict';
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */



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
     * Create a record.
     *
     * @return {Object}
     */

    async create(ctx) {

        const required = ['route', 'startTime', 'type', 'hub']

        let data, entity;
        if (ctx.is('multipart')) {
            const obj = parseMultipartData(ctx);
            data = obj['data']
        } else {
            data = ctx.request.body;
        }

        const missingField = validateRequiredFields(required, data);
        if (missingField != null) {
            return handleError(ctx, null, 400, "Missing value for one or more required field(s). Missing field: " + missingField)
        }
        try {
            entity = await strapi.services.template.create(data);
        } catch (error) {
            if (error.name === 'ValidationError') {
                console.log("Validaation error")
                return handleError(ctx, null, 400, "Validation Error.")
            }
            throw (error)
        }

        return sanitizeEntity(entity, { model: strapi.models.template });
    },

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

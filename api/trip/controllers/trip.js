'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const R = 6371; // earth's mean radius in km
const sin = Math.sin, cos = Math.cos, acos = Math.acos;
const π = Math.PI;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

function getParams(lat, lon, radius) {
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    radius = parseFloat(radius);
    const params = {
        minLat: lat - radius / R * 180 / π,
        maxLat: lat + radius / R * 180 / π,
        minLon: lon - radius / R * 180 / π / cos(lat * π / 180),
        maxLon: lon + radius / R * 180 / π / cos(lat * π / 180),
    };
    return params;
}

module.exports = {
    async near(ctx) {
        let { lat, lon, radius } = ctx.query;
        if (!radius)
            radius = 4;
        if (!lat || !lon) {
            ctx.response.status = 400;
            ctx.response.error = 'Bad request.'
            let error_pack = {
                status: 400,
                error: 'Bad request.',
                message: 'Coordinates not supplied with the request.'
            }
            return error_pack;
        }
        let params = getParams(lat, lon, radius);
        console.log(lat, lon, radius)
        console.log(params)
        let entities = await strapi.query('trip').find({ lat_gt: params.minLat, lat_lt: params.maxLat, long_gt: params.minLon, long_lt: params.maxLon });

        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.trip }));
    },
};

'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const R = 6371; // earth's mean radius in km
const sin = Math.sin, cos = Math.cos, acos = Math.acos;
const π = Math.PI;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */


function toRad(theta) {
    return Math.PI * theta / 180;
}


function convert(la, lo, bias) {
    la = toRad(la)
    lo = toRad(lo)
    // console.log('Radian => ', la, lo, centre);
    let x = R * lo * bias;
    let y = R * la
    console.log('Cartesian: ', x, y);
    return [x, y];
}

function dist(x, y, x1, y1) {
    let d = Math.sqrt(Math.pow((x1 - x), 2) + Math.pow((y1 - y), 2))
    return d;
}


function getParams(lat, lon, radius) {
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
        let { lat, lon, lat_d, lon_d } = ctx.query;
        if (!lat || !lon || !lat_d || !lon_d) {
            ctx.response.status = 400;
            ctx.response.error = 'Bad request.'
            let error_pack = {
                status: 400,
                error: 'Bad request.',
                message: 'Coordinates not supplied with the request. You should supply lat, lon, lat_d and lon_d.'
            }
            return error_pack;
        }
        lat = parseFloat(lat);
        lon = parseFloat(lon);
        lat_d = parseFloat(lat_d);
        lon_d = parseFloat(lon_d);

        let lat_offset = lat + lat_d;
        let lon_offset = lon + lon_d;

        let bias = Math.cos(lat);

        let l = convert(lat, lon, bias);
        let x = l[0]
        let y = l[1]

        l = convert(lat_offset, lon, bias);
        let x1 = l[0]
        let y1 = l[1]

        let h_d = dist(x, y, x1, y1);

        l = convert(lat, lon, bias);
        x = l[0]
        y = l[1]

        l = convert(lat, lon_offset, bias);
        x1 = l[0]
        y1 = l[1]

        let v_d = dist(x, y, x1, y1);


        let radius = (v_d > h_d) ? v_d : h_d;

        let params = getParams(lat, lon, radius);
        console.log(lat, lon, radius)
        console.log(params)
        let entities = await strapi.query('trip').find({ lat_gt: params.minLat, lat_lt: params.maxLat, long_gt: params.minLon, long_lt: params.maxLon });

        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.trip }));
    },
};

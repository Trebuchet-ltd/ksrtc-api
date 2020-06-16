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
    return π * theta / 180;
}


function convert(la, lo, bias) {
    la = toRad(la)
    lo = toRad(lo)
    // console.log('Radian => ', la, lo, centre);
    let x = R * lo * bias;
    let y = R * la
    return [x, y];
}


function dist(x, y, x1, y1) {
    let d = Math.sqrt(Math.pow((x1 - x), 2) + Math.pow((y1 - y), 2))
    return d;
}


function getDistance(lat, lon, h_lat, h_lon) {

    lat = parseFloat(lat);
    lon = parseFloat(lon);

    let bias = cos(lat + (h_lat - lat));

    let l = convert(lat, lon, bias);
    let x = l[0]
    let y = l[1]

    l = convert(h_lat, h_lon, bias);
    let x1 = l[0]
    let y1 = l[1]

    let d = dist(x, y, x1, y1);

    console.log('Distance', d);


    if (isNaN(d)) {
        console.log(lat, lon, h_lat, h_lon)
        console.log(x, y, x1, y1);
        throw 'Error in distance claclulation.';
    }

    return d;
}

module.exports = {

    async checkin(ctx) {

        if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
            try {
                const { id, isAdmin = false } = await strapi.plugins[
                    'users-permissions'
                ].services.jwt.getToken(ctx);

                // The Authenticated user from the JWT.
                const user = ctx.state.user;


                // The POST data.
                let body = ctx.request.body;
                // Handling for alternate content-types of the POST data.
                if (typeof (ctx.request.body) === 'string') {
                    body = JSON.parse(ctx.request.body)
                }

                // Location validation for Checking In. User should be within the hub limits.
                let lat = body['lat'];
                let lon = body['lon'];

                let hub = await strapi.query('hub').findOne({ id: user.hub });

                let h_lat = hub.lat;
                let h_lon = hub.long;

                let d = getDistance(lat, lon, h_lat, h_lon);

                if (d > 2) {
                    console.log('User location:', lat, lon);
                    console.log('Hub location:', h_lat, h_lon);
                    ctx.response.status = 406;
                    ctx.response.error = 'Not Acceptable.'
                    let error_pack = {
                        status: 406,
                        error: 'Not Acceptable.',
                        message: 'You should be within your hub limits to check in.'
                    }
                    return error_pack;
                }


                // Adding the record to the attendace register.
                strapi.query('attendance').create({
                    user: id,
                    time: new Date(),
                    hub: user.hub,
                });


                // Creating the query to find the trips associated with the conductor / driver.
                let query = { status_ne: 'completed' }
                query[user.user_type] = id;


                // Returning a list of the remaining trips of the day.
                let trips = await strapi.query('trip').find(query);

                // return sanitizeEntity(trips, { model: strapi.models.trip });
                return trips;

            } catch (err) {
                // TODO: Decrease the amount of DATA given for security reasons.
                console.log(err)
                ctx.response.status = 500;
                let error_pack = {
                    status: 500,
                    message: err
                }
                return error_pack;

            }
        }
    }
};

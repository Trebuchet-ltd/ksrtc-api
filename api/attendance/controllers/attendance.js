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


module.exports = {

    async checkin(ctx) {

        if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
            try {
                const { id, isAdmin = false } = await strapi.plugins[
                    'users-permissions'
                ].services.jwt.getToken(ctx);

                const user = ctx.state.user;


                let body = ctx.request.body;
                if (typeof (ctx.request.body) === 'string') {
                    body = JSON.parse(ctx.request.body)
                    console.log('Body type', typeof (ctx.request.body));
                }

                let lat = body['lat'];
                let lon = body['lon'];

                lat = parseFloat(lat);
                lon = parseFloat(lon);


                let hub = await strapi.query('hub').findOne({ id: user.hub });

                let h_lat = hub.lat;
                let h_lon = hub.long;

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
                    console.log('User', user.id)
                    console.log('Hub', hub.id)
                    console.log(lat, lon, h_lat, h_lon)
                    console.log(x, y, x1, y1);
                    throw 'Error in distance claclulation.';
                }

                // if (d > 2) {
                //     ctx.response.status = 406;
                //     ctx.response.error = 'Not Acceptable.'
                //     let error_pack = {
                //         status: 406,
                //         error: 'Not Acceptable.',
                //         message: 'You should be within your hub limits to check in.'
                //     }
                //     return error_pack;
                // }
                // else {

                    let data = {
                        user: id,
                        time: new Date(),
                        hub: user.hub,
                    }

                    strapi.query('attendance').create(data);

                    // let now = new Date()
                    // let today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

                    let query = { status_ne: 'completed' }

                    // console.log(user.user_type)
                    if (user.user_type === 'conductor') {
                        query['conductor'] = id;
                    } else {
                        query['driver'] = id;
                    }

                    let trips = await strapi.query('trip').find(query);

                    // return sanitizeEntity(trips, { model: strapi.models.trip });
                    return trips;

                // }


            } catch (err) {
                // It will be there!
                console.log(err)
                ctx.response.status = 500;
                let error_pack = {
                    status: 500
                }
                return error_pack;

            }
        }
    }
};

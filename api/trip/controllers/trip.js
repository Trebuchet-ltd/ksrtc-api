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
    return [x, y];
}

function dist(x, y, x1, y1) {
    let d = Math.sqrt(Math.pow((x1 - x), 2) + Math.pow((y1 - y), 2))
    return d;
}

function getNearParams(lat, lon, lat_d, lon_d) {

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

    return getParams(lat, lon, radius);
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
    console.log('User location:', lat, lon);
    console.log('Hub location:', h_lat, h_lon);

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

module.exports = {

    async update(ctx) {
        const { id } = ctx.params;

        if (keyInObj('conductor_status', ctx.request.body) || keyInObj('driver_status', ctx.request.body)) {
            let entity = await strapi.services.trip.findOne({ id });

            const first_person = keyInObj('conductor_status', ctx.request.body) ? 'conductor_status' : 'driver_status';
            const second_person = keyInObj('driver_status', ctx.request.body) ? 'conductor_status' : 'driver_status';

            // Trip not started.
            if (entity.status == 'not_started' && ctx.request.body[first_person] == 'start_ready' && entity[second_person] == 'start_ready')
                ctx.request.body.status = 'in_progress';

            // Trip not started.
            if (entity.status == 'in_progress' && ctx.request.body[first_person] == 'end_ready' && entity[second_person] == 'end_ready')
                ctx.request.body.status = 'completed';

            console.log(ctx.request.body);

        }

        if (keyInObj('lat', ctx.request.body) || keyInObj('long', ctx.request.body)) {
            if (keyInObj('loc_last_update', ctx.request.body)) {
                let entity = await strapi.services.trip.findOne({ id });
    
                if (entity.loc_last_update > ctx.request.body.loc_last_update)
                    return handleError(ctx, null, 409, 'Late Request Conflict.');
            } else {
                return handleError(ctx, null, 400, 'Request does not contain timestamp. (loc_last_update)');
            }
        }



        let entity = await strapi.services.trip.update({ id }, ctx.request.body);


        return sanitizeEntity(entity, { model: strapi.models.trip });
    },

    async endCurrentTrip(ctx) {

        const user = ctx.state.user;

        if (!(user.user_type == 'conductor' || user.user_type == 'driver')) {
            return handleError(ctx, null, 401, 'You must be logged in as a conductor for this operation.');
        }

        let query = { status: 'in_progress' }
        query[user.user_type] = user.id;

        let current_trip = await strapi.query('trip').findOne(query);

        if (!current_trip)
            return handleError(ctx, null, 404, "No in_progress trip found for the user.");


        let hub = await strapi.query('hub').findOne({ id: current_trip.route.to });


        if (!hub)
            return handleError(ctx, null, 404, "No destination hub found.");


        if (!keyInObj('lat', current_trip) || !keyInObj('long', current_trip))
            return handleError(ctx, null, 404, "Coordinates not found in the trip object.");

        if (!keyInObj('lat', hub) || !keyInObj('long', hub))
            return handleError(ctx, null, 404, "Coordinates not found in the hub object.");

        let lat = current_trip.lat;
        let lon = current_trip.long;

        let h_lat = hub.lat;
        let h_lon = hub.long;

        let d = getDistance(lat, lon, h_lat, h_lon);

        if (isNaN(d))
            return handleError(ctx, null, 500, 'Error in distance claclulation.');

        if (d > 2)
            return handleError(ctx, null, 406, 'You should be within your destination hub limits to end trip.');

        let entity = await strapi.services.trip.update({ id: current_trip.id }, { status: 'completed' });

        console.log('Trip', entity.id, 'completed.');

        let data = {
            user: user.id,
            time: new Date(),
            hub: entity.route.to
        }

        strapi.query('attendance').create(data);

        query = { status_ne: 'completed' }
        query[user.user_type] = user.id;


        let trips = await strapi.query('trip').find(query);

        return trips;

    },

    /**
 * Update location.
 *
 * @return {Object}
 */

    async location(ctx) {
        const { id } = ctx.params;

        let entity;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            entity = await strapi.services.trip.update({ id }, data, {
                files,
            });

        } else {
            entity = await strapi.services.trip.update({ id }, ctx.request.body);
        }

        let data = ctx.request.body;
        data['action'] = 'update';
        data['time'] = new Date();
        data['trip'] = entity.id;
        data['next_stop'] = entity.next_stop;
        data['number_of_passengers'] = entity.number_of_passengers;
        strapi.query('logs').create(data);


        return sanitizeEntity(entity, { model: strapi.models.trip });
    },


    /**
      * Next stop.
      *
      * @return {Object}
      */

    async nextStop(ctx) {
        const { id } = ctx.params;

        let entity = await strapi.services.trip.findOne({ id });
        if (!('next_stop' in entity)) {
            let payload = {
                'next_stop': entity.route.stops[1]
            }
            entity = await strapi.services.trip.update({ id }, payload);
        } else {
            let prev = entity.next_stop;
            let ids = entity.route.stops.map((s) => { return s._id.toString() });
            let index = ids.indexOf(prev.id);
            let update = ctx.request.body
            if (!keyInObj('lat', prev) || !keyInObj('long', prev)) {
                console.log('Adding location to stop: ', prev.name)
                console.log(ctx.request.body);
                let hub, current_trip;
                let lat, lon;
                const user = ctx.state.user;
                if (!keyInObj('lat', update)) {

                    try {
                        let query = { status: 'in_progress' }
                        console.log(user.user_type)
                        query['conductor'] = user.id;
                        console.log(query)
                        current_trip = await strapi.query('trip').findOne(query);
                        // console.log(current_trip
                        if (!current_trip) {
                            throw "No in_progress trip for conductor or  hub."
                        }
                    } catch (error) {
                        console.log(error)
                        if (error.status == 404) {
                            ctx.response.status = 500;
                            let error_pack = {
                                status: 500,
                                message: 'There is no current_trip assigned to the conductor.'
                            }
                            return error_pack;
                        }
                    }



                    try {
                        lat = current_trip.lat;
                        lon = current_trip.long;

                        if (!lat || !lon) {
                            throw "No Lat Long in trip"
                        }
                    } catch (error) {

                        console.log(error)
                        ctx.response.status = 400;
                        ctx.response.error = 'Bad request.'
                        let error_pack = {
                            status: 400,
                            error: 'Bad request.',
                            message: 'Coordinates not found in the trip object.'
                        }
                        return error_pack;

                    }

                    lat = parseFloat(lat);
                    lon = parseFloat(lon);
                    update = {
                        'lat': lat,
                        'long': lon
                    }
                }
                strapi.query('hub').update(
                    { id: prev.id },
                    update
                );
            }
            index = (index + 1 >= entity.route.stops.length) ? entity.route.stops.length - 1 : index + 1;
            let payload = {
                'next_stop': entity.route.stops[index]
            }
            entity = await strapi.services.trip.update({ id }, payload);
        }
        return sanitizeEntity(entity, { model: strapi.models.trip });
    },

    async near(ctx) {
        let { lat, lon, lat_d, lon_d } = ctx.query;
        if (!lat || !lon || !lat_d || !lon_d)
            return handleError(ctx, null, 400, 'Coordinates not supplied with the request. You should supply lat, lon, lat_d and lon_d.');

        let params = getNearParams(lat, lon, lat_d, lon_d);
        let trips = await strapi.query('trip').find({ status: 'in_progress', lat_gt: params.minLat, lat_lt: params.maxLat, long_gt: params.minLon, long_lt: params.maxLon });
        let hubs = await strapi.query('hub').find({ lat_gt: params.minLat, lat_lt: params.maxLat, long_gt: params.minLon, long_lt: params.maxLon });

        console.log('Buses in screen:', trips.length);
        trips.map((bus) => { console.log(bus.lat, bus.long) })
        console.log('Hubs in screen:', hubs.length);
        hubs.map((hub) => { console.log(hub.lat, hub.long) })

        return { trips, hubs };
    },

    /**
 * Retrieve a deeply populated record.
 *
 * @return {Object}
 */

    async getOneDeep(ctx) {
        const { id } = ctx.params;

        const entity = await strapi.services.trip.findOne({ id }, [
            {
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
            },
            {
                path: 'conductor'
            },
            {
                path: 'bus'
            },
            {
                path: 'next_stop'
            },
            {
                path: 'hub'
            },
        ]);
        return sanitizeEntity(entity, { model: strapi.models.trip });
    },


    /**
 * Retrieve records.
 *
 * @return {Array}
 */

    async getDeep(ctx) {
        if (ctx.query._q) {
            return strapi.services.trip.search(ctx.query);
        }
        return strapi.services.trip.find(ctx.query, [
            {
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
            },
            {
                path: 'conductor'
            },
            {
                path: 'bus'
            },
            {
                path: 'next_stop'
            },
            {
                path: 'hub'
            },
        ]);
    },
};

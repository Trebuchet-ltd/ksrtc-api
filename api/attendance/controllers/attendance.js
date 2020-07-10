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
    console.log('User location:', lat, lon);
    console.log('Hub location:', h_lat, h_lon);

    return d;
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

    async checkin(ctx) {

        const user = ctx.state.user;

        if (!(user.user_type == 'conductor' || user.user_type == 'driver')) {
            return handleError(ctx, null, 401, 'You must be logged in as a conductor for this operation.');
        }


        let query = { status: 'not_started' }
        query[user.user_type] = user.id;

        let current_trip = await strapi.query('trip').findOne(query);

        let hub;
        if (!current_trip){
            console.log("No new trip assigned to user ", user.id);
            hub = await strapi.query('hub').findOne({ id: user.hub });
        } else{
            hub = await strapi.query('hub').findOne({ id: current_trip.route.from });
        }


        if (!hub)
            return handleError(ctx, null, 404, "No starting hub found.");

        if (!keyInObj('lat', hub) || !keyInObj('long', hub))
            return handleError(ctx, null, 404, "Coordinates not found in the hub object.");

        // The POST data.
        let body = ctx.request.body;
        // Handling for alternate content-types of the POST data.
        if (typeof (ctx.request.body) === 'string') {
            body = JSON.parse(ctx.request.body)
        }

        if (!keyInObj('lat', body) || !keyInObj('lon', body))
            return handleError(ctx, null, 404, "Coordinates not found in the request.");



        console.log("Checking into ", hub.name);

        // Location validation for Checking In. User should be within the limits of the From Hub of his first trip.
        let lat = body['lat'];
        let lon = body['lon'];

        let h_lat = hub.lat;
        let h_lon = hub.long;


        let d = getDistance(lat, lon, h_lat, h_lon);

        if (isNaN(d))
            return handleError(ctx, null, 500, 'Error in distance claclulation.');

        if (d > 2)
            return handleError(ctx, null, 406, 'You should be within ' + hub.name + ' hub limits to check in.');


        // Adding the record to the attendace register.
        strapi.query('attendance').create({
            user: user.id,
            time: new Date(),
            hub: user.hub,
        });


        // Creating the query to find the trips associated with the conductor / driver.
        query = { status_ne: 'completed' }
        query[user.user_type] = user.id;


        // Returning a list of the remaining trips of the day.
        let trips = await strapi.query('trip').find(query);

        return trips;
    }
};

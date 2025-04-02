function distanceFromLine(line, p) {
    // vertical line
    if (line[0].x === line[1].x) {
        // distance is the difference in x
        return Math.abs(line[0].x - p.x);
    }

    const slope1 = (line[0].y - line[1].y) / (line[0].x - line[1].x);
    // y = mx+b, b = y - mx
    const intercept1 = line[0].y - slope1 * line[0].x;

    // horizontal line
    if (slope1 === 0) {
        // similar to above, just from the y
        return Math.abs(line[0].y - p.y);
    }

    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    const dist = Math.abs((line[1].y - line[0].y) * p.x - (line[1].x - line[0].x) * p.y + line[1].x * line[0].y - line[1].y * line[0].x) / Math.sqrt(Math.pow(line[1].y - line[0].y, 2) + Math.pow(line[1].x - line[0].x, 2));

    return dist;
}

function doLinesIntersect(l1p1, l1p2, l2p1, l2p2) {
    const l1MaxY = Math.max(l1p1[1], l1p2[1]);
    const l1MinY = Math.min(l1p1[1], l1p2[1]); 
    const l1MaxX = Math.max(l1p1[0], l1p2[0]);
    const l1MinX = Math.min(l1p1[0], l1p2[0]); 
    const l2MaxY = Math.max(l2p1[1], l2p2[1]);
    const l2MinY = Math.min(l2p1[1], l2p2[1]);
    const l2MaxX = Math.max(l2p1[0], l2p2[0]);
    const l2MinX = Math.min(l2p1[0], l2p2[0]);

    // vertical line
    if (l1p1[0] === l1p2[0]) {
        // to intersect, the x coords of our l2 must be on opposite sides
        if (
            (l2p1[0] <= l1p1[0] && l2p2[0] >= l1p1[0]) ||
            (l2p2[0] <= l1p1[0] && l2p1[0] >= l1p1[0]) 
        ) {
            // once that's true it only intersects if either of the l2
            // y coords is between the l1 y coords OR one coord is above
            // and one is below. So basically if y coords of l2 are above
            // or below l1 y coords, then it does not intersect, and this
            // is less code to check

            if (
                (l2p1[1] > l1MaxY && l2p2[1] > l1MaxY) ||
                (l2p1[1] < l1MinY && l2p2[1] < l1MaxY)
            ) {
                return false;
            }

            // in this case the x coords indicate intersection and the y
            // coords indicate that it does as well
            return true;
        }

        return false;
    }
    if (l2p1[0] === l2p2[0]) {
        // basically same thing as above with flipped lines
        if (
            (l1p1[0] <= l2p1[0] && l1p2[0] >= l2p1[0]) ||
            (l1p2[0] <= l2p1[0] && l1p1[0] >= l2p1[0]) 
        ) {
            if (
                (l1p1[1] > l2MaxY && l1p2[1] > l2MaxY) ||
                (l1p1[1] < l2MinY && l1p2[1] < l2MaxY)
            ) {
                return false;
            }
            return true;
        }

        return false;
    }

    const slope1 = (l1p1[1] - l1p2[1]) / (l1p1[0] - l1p2[0]);
    // y = mx+b, b = y - mx
    const intercept1 = l1p1[1] - slope1 * l1p1[0];

    const slope2 = (l2p1[1] - l2p2[1]) / (l2p1[0] - l2p2[0]);
    // y = mx+b, b = y - mx
    const intercept2 = l2p1[1] - slope2 * l2p1[0];

    //console.log(slope1, intercept1, slope2, intercept2);

    // if slopes are the same then if the intercepts are also the same
    // then its the same line. If slopes are the same and intercept is not
    // the same then no overlap at all
    if (slope1 === slope2) {
        if (intercept1 === intercept2) {
            // now a point-we might be looking at the same line but
            // a different segment of the line. So we must check if
            // the two line segments are overlapping. We can do this by
            // looking and seeing if the max x of either line is above
            // the min x of the other.
            if (
                Math.max(l1p1[0], l1p2[0]) >= Math.min(l2p1[0], l2p2[0]) ||
                Math.max(l2p1[0], l2p2[0]) >= Math.min(l1p1[0], l1p2[0])
            ) {
                return true;
            }
        } else {
            return false;
        }
    }

    // if one slope is 0 and the other is not, it means that one of our
    // lines is completely horizontal so we can just find the corresponding
    // x on the non horiz line for the horiz line's y. If that x is within
    // both line segments then it's a hit
    if (slope1 === 0) {
        const otherX = (l1p1[1] - intercept2) / slope2;
        //console.log(otherY);
        return (
            otherX <= l1MaxX &&
            otherX >= l1MinX &&
            otherX <= l2MaxX &&
            otherX >= l2MinX
        );
    } else if (slope2 === 0) {
        const otherX = (l2p1[1] - intercept1) / slope1;
        //console.log(otherY);
        return (
            otherX <= l1MaxX &&
            otherX >= l1MinX &&
            otherX <= l2MaxX &&
            otherX >= l2MinX
        );
    }

    // if one slope is 0 and the other is not then it means one line is
    // completely horizontal. In this case we want to find the
    // corresponding x on the non horiz line for the horiz line's y. If 
    // that x is within both line segments then it's a hit
    if (slope1 === 0) {
        // x = (y - b) / m
        const otherX = (l1p1[1] - intercept2) / slope2;
        //console.log(otherX);
        return (
            otherX <= Math.max(l1p1[0], l1p2[0]) &&
            otherX >= Math.min(l1p1[0], l1p2[0]) &&
            otherX <= Math.max(l2p1[0], l2p2[0]) &&
            otherX >= Math.min(l2p1[0], l2p2[0])
        );
    } else if (slope2 === 0) {
        // x = (y - b) / m
        const otherX = (l2p1[1] - intercept1) / slope1;
        //console.log(otherX);
        return (
            otherX <= Math.max(l1p1[0], l1p2[0]) &&
            otherX >= Math.min(l1p1[0], l1p2[0]) &&
            otherX <= Math.max(l2p1[0], l2p2[0]) &&
            otherX >= Math.min(l2p1[0], l2p2[0])
        );
    }

    // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
    // for lines
    // y = ax+c and y = bx+d
    // x = (d - c) / (a - b)
    // y = a * ( (d - c) / (a - b) ) + c
    const intersectX = (intercept2 - intercept1) / (slope1 - slope2);
    const intersectY = slope1 * intersectX + intercept1;

    // now are these points on both line segments? We assume if
    // the x suffices, then the y probably will
    const onL1 = Math.max(l1p1[0], l1p2[0]) >= intersectX &&
    Math.min(l1p1[0], l1p2[0]) < intersectX;
    const onL12= Math.max(l2p1[0], l2p2[0]) >= intersectX &&
    Math.min(l2p1[0], l2p2[0]) < intersectX;

    return onL1 && onL12;
}
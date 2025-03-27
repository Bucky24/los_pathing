const canvas = document.getElementById("canvas");
const button = document.getElementById("step");
const pathList = document.getElementById("path_list");
const runButton = document.getElementById("run");

canvas.addEventListener("click", (e) => {
    const rect = e.target.getBoundingClientRect();
    console.log(`[${e.clientX - rect.left}, ${e.clientY - rect.top}]`);
});

button.addEventListener('click', () => {
    update();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runButton.addEventListener('click', async () => {
    start();
    let count = 0;
    while (queue.length > 0) {
        console.log(queue.length, count);
        processQueue();
        count ++;
        if (count > 2000) {
            break;
        }

        renderPathList();

        draw();

        await sleep(5);
    }

    renderPathList();

    draw();

    console.log(queue);
});


const width = 500;
const height = 500;

const startPoint = [40, 200];
let position = [];
let queue = [];
const end = [400, 50];
const walls = [
    [60, 0, 80, 300],
    [200,200, 300, 220],
    [89, 274, 176, 331],
];
let points = [];
let path = [];
let validPath = null;
let selectedPath = null;
let processed = {};
let preComputedPoints = [];
let endPoints = [];
const maxDistToLine = 5;
let los;

const overridePoints = null;
/*const overridePoints = [
    [18, 264],
    [180, 350],
    [53, 425],
    [126, 130],
    [...end],
];*/

function addValidPath(path) {
    const cost = getPathCost(path);
    if (!validPath || cost < getPathCost(validPath)) {
        validPath = path;
    } else {
        //console.log("Rejecting path", path, "cost too much");
    }
}

function distanceFromLine(l1p1, l1p2, p) {
    // vertical line
    if (l1p1[0] === l1p2[0]) {
        // distance is the difference in x
        return Math.abs(l1p1[0] - p[0]);
    }

    const slope1 = (l1p1[1] - l1p2[1]) / (l1p1[0] - l1p2[0]);
    // y = mx+b, b = y - mx
    const intercept1 = l1p1[1] - slope1 * l1p1[0];

    // horizontal line
    if (slope1 === 0) {
        // similar to above, just from the y
        return Math.abs(l1p1[1] - p[1]);
    }

    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    const dist = Math.abs((l1p2[1] - l1p1[1]) * p[0] - (l1p2[0] - l1p1[0]) * p[1] + l1p2[0] * l1p1[1] - l1p2[1] * l1p1[0]) / Math.sqrt(Math.pow(l1p2[1] - l1p1[1], 2) + Math.pow(l1p2[0] - l1p1[0], 2));

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

function addToQueue(position, path) {
    // don't allow loops in the path
    for (const item of path) {
        if (item[0] === position[0] && item[1] === position[1]) {
            return;
        }
    }

    const key = los.keyPoint(position);

    const cost = Math.sqrt(Math.pow(position[0] - end[0], 2) + Math.pow(position[1] - end[1], 2));
    let pathCost = 0;
    let previous = null;
    for (const point of path) {
        if (previous) {
            pathCost += Math.sqrt(Math.pow(point[0] - previous[0], 2) + Math.pow(point[1] - previous[1], 2));
        }
        previous = point;
    }
    if (previous) {
        pathCost += Math.sqrt(Math.pow(previous[0] - position[0], 2) + Math.pow(previous[1] - position[1], 2));
    }

    const newQueueObj = {
        position,
        path,
        cost,
        pathCost,
    };

    // is this item already in the queue? If so, only add it again if our current path
    // is shorter than the one already in queue
    if (processed[key] !== undefined && processed[key] !== null) {
        // find our path in the queue
        const index = queue.findIndex((a) => {
            return a.position[0] === position[0] && a.position[1] === position[1];
        });
        // if the item has already been processed, then it was probably cheaper
        // than our path and we can just skip. Otherwise, we can compare
        if (index >= 0) {
            const cost = getPathCost(path);
            const otherCost = getPathCost(queue[index].path);

            if (cost < otherCost) {
                queue[index] = newQueueObj;
            }
        }
        return;
    }

    //console.log(path);

    //const cost = getPathCost([...path, position]);
    // distance to the end

    //console.log('hanlding', position);

    let inserted = false;
    for (let i=0;i<queue.length;i++) {
        if (queue[i].pathCost >= pathCost) {
            queue.splice(i, 0, newQueueObj);
            inserted = true;
            break;
        }
    }

    if (!inserted) {
        queue.push(newQueueObj);
    }
    processed[keyPoint(position)] = true;
}

function processQueue() {
    if (queue.length === 0) {
        return;
    }

    const queueItem = queue.shift();

    let pointsForPosition = los.getPointsFromPosition(queueItem.position);
        pointsForPosition = pointsForPosition.filter((point) => {
        for (const item of queueItem.path) {
            if (item[0] === point[0] && item[1] === point[1]) {
                //console.log('matcing');
                return false;
            }
        }

        return true;
    });

    position = queueItem.position;
    points = pointsForPosition;
    path = queueItem.path;

   // console.log('procesing queue got points', points.length);
    for (const point of points) {
        // is this point a point that can see the end?
        const key = los.keyPoint(point);
        if (endPoints[key]) {
            addValidPath([...path, position, ...endPoints[key]]);
            continue;
        }

        //console.log('checking', point);
        addToQueue(point, [...path, position]);
    }
    //console.log('when done', queue.length, processed.length);
}

function getPathCost(path) {
    let cost = 0;
    let last = null;
    for (let item of path) {
        if (last) {
            const dist = Math.sqrt(Math.pow(last[0] - item[0],2) + Math.pow(last[1]-item[1] ,2));
            cost += dist;
        }
        last = item;
    }

    return cost;
}

function renderPathList() {
    pathList.innerHTML = "";

    let count = 0;
    if (validPath) {
        const cost = getPathCost(validPath);
        const text = `Path of cost ${cost} - ${validPath.length} steps`;
        const holder = document.createElement("div");
        holder.textContent = text;

        pathList.appendChild(holder);
    }
}

function update() {
    processQueue();

    renderPathList();

    draw();
}

function draw() {
    const ctx = canvas.getContext("2d");
    ctx.save();

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(start[0], start[1], 10, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(end[0], end[1], 10, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(position[0], position[1], 10, 0, 2*Math.PI);
    ctx.fill();

    for (const wall of walls) {
        ctx.fillStyle = "rgba(128, 0, 128, 0.5)";
        ctx.fillRect(wall[0], wall[1], Math.abs(wall[0]-wall[2]), Math.abs(wall[1]-wall[3]));
    }

    /*for (const point of points) {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(point[0], point[1], 5, 0, 2*Math.PI);
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(position[0], position[1]);
        ctx.lineTo(point[0], point[1]);
        ctx.stroke();
    }*/

    for (const point of getAllPoints().points) {
        ctx.fillStyle = "purple";
        ctx.beginPath();
        ctx.arc(point[0], point[1], 2, 0, 2*Math.PI);
        ctx.fill();
    }

    //console.log(path);
    if (path.length > 0) {
        let last = null;
        for (const point of path) {
            if (last) {
                ctx.strokeStyle = "green";
                ctx.beginPath();
                ctx.moveTo(last[0], last[1]);
                ctx.lineTo(point[0], point[1]);
                ctx.stroke();
            }
            last = point;
        }
        if (last) {
            ctx.strokeStyle = "green";
            ctx.beginPath();
            ctx.moveTo(last[0], last[1]);
            ctx.lineTo(position[0], position[1]);
            ctx.stroke();
        }
    }

    if (validPath) {
        let last = null;
        for (const point of validPath) {
            if (last) {
                ctx.strokeStyle = "#0f0";
                ctx.beginPath();
                ctx.moveTo(last[0], last[1]);
                ctx.lineTo(point[0], point[1]);
                ctx.stroke();
            }
            last = point;
        }
    }

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, width, height);

    ctx.restore();
}

function start() {
    position = [...startPoint];
    queue = [];
    processed = {};
    validPath = null;
    points = [];
    path = [];
    selectedPath = null;
    preComputedPoints = [];
    endPoints = [];
    allPoints = null;
    los = new Los(width, height, start, end, walls, overridePoints);

    addToQueue(startPoint, [], []);
    preCompute();
    update();
}

start();
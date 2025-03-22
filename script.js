const canvas = document.getElementById("canvas");
const button = document.getElementById("step");
const pathList = document.getElementById("path_list");
const runButton = document.getElementById("run");

button.addEventListener('click', () => {
    update();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runButton.addEventListener('click', async () => {
    let count = 0;
    while (queue.length > 0) {
        console.log(queue.length, count, validPaths.length);
        processQueue();
        count ++;
        if (count > 2000) {
            break;
        }

        if (validPaths.length > 1000) {
            break;
        }

        renderPathList();

        draw();

        await sleep(10);
    }

    sortValidPaths();
    renderPathList();

    draw();

    console.log(queue);
});


const width = 500;
const height = 500;

const start = [40, 200];
let position = [...start];
const queue = [];
const end = [400, 50];
const walls = [
    [60, 0, 80, 300],
    [200,200, 300, 220],
];
let points = [];
let path = [];
const validPaths = [];
let selectedPath = null;
const processed = [];
const preComputedPoints = [];
let endPoints = [];

function keyPoint(point) {
    return `${point[0]},${point[1]}`;
}

function preCompute() {
    endPoints = getPointsFromPosition(end).map((point) => keyPoint(point)).reduce((obj, key) => {
        return {
            ...obj,
            [key]: true,
        };
    }, {});
}

function sortValidPaths() {
    validPaths.sort((a, b) => {
        const costA = getPathCost(a);
        const costB = getPathCost(b);

        return costA - costB;
    });
}

function doLinesIntersect(l1p1, l1p2, l2p1, l2p2) {
    let slope1;
    if (l1p1[0] === l1p2[0]) {
        slope1 = 1;
    } else {
        slope1 = (l1p1[1] - l1p2[1]) / (l1p1[0] - l1p2[0]);
    }
    // y = mx+b, b = y - mx
    const intercept1 = l1p1[1] - slope1 * l1p1[0];

    let slope2;
    if (l2p1[0] === l2p2[0]) {
        slope2 = 1;
    } else {
        slope2 = (l2p1[1] - l2p2[1]) / (l2p1[0] - l2p2[0]);
    }
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

    // if one slope is 1 and the other is not, it means that one of our
    // lines is completely vertical so we can just find the corresponding
    // y on the non vert line for the vert line's x. If that y is within
    // both line segments then it's a hit
    if (slope1 === 1) {
        const otherY = slope2 * l1p1[0] + intercept2;
        //console.log(otherY);
        return (
            otherY <= Math.max(l1p1[1], l1p2[1]) &&
            otherY >= Math.min(l1p1[1], l1p2[1]) &&
            otherY <= Math.max(l2p1[1], l2p2[1]) &&
            otherY >= Math.min(l2p1[1], l2p2[1])
        );
    } else if (slope2 === 1) {
        const otherY = slope1 * l2p1[0] + intercept1;
        //console.log(otherY);
        return (
            otherY <= Math.max(l1p1[1], l1p2[1]) &&
            otherY >= Math.min(l1p1[1], l1p2[1]) &&
            otherY <= Math.max(l2p1[1], l2p2[1]) &&
            otherY >= Math.min(l2p1[1], l2p2[1])
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

setInterval(() => {
    //update();
}, 100);

let allPoints = null;
function getAllPoints() {
    if (allPoints) {
        return allPoints;
    }
    let points = [];
    const lines = [];

    points.push([...end]);

    for (let i=0;i<walls.length;i++) {
        const wall = walls[i];

        const cx = (Math.abs(wall[0] - wall[2]) / 2) + Math.min(wall[0], wall[2]);
        const cy = (Math.abs(wall[1] - wall[3]) / 2) + Math.min(wall[1], wall[3]);

        const key = `wall_${i}`;

        const addablePoints = [
            [wall[0], wall[1]],
            [wall[2], wall[1]],
            [wall[0], wall[3]],
            [wall[2], wall[3]]
        ];

        for (const point of addablePoints) {
            // move a bit away from the center
            let ux = point[0] - cx;
            ux = ux / Math.abs(ux);

            let uy = point[1] - cy;
            uy = uy / Math.abs(uy);

            // these three points basically give us a big of a curve around the corner
            points.push([
                point[0] + ux * 1,
                point[1] + uy * 1,
                key,
            ]);

            /*points.push([
                point[0] + ux * 1,
                point[1],
                key,
            ]);

            points.push([
                point[0],
                point[1] + uy * 1,
                key,
            ]);*/
        }

        lines.push([wall[0], wall[1], wall[2], wall[1]]);
        lines.push([wall[2], wall[1], wall[2], wall[3]]);
        lines.push([wall[2], wall[3], wall[0], wall[3]]);
        lines.push([wall[0], wall[3], wall[0], wall[1]]);
    }

    // add points involving the outer edge of the map
    for (let i=0;i<=width;i+=Math.floor(width / 4)) {
        points.push([i, 0, 'outer']);
        points.push([i, height, 'outer']);
    }

    for (let i=0;i<=height;i+=Math.floor(height / 4)) {
        points.push([0, i, 'outer']);
        points.push([width, i, 'outer']);
    }

    // now calculate halfway points between everything

    const length = points.length;
    for (let i = 0;i<length;i++) {
        for (let j=i+1;j<length;j++) {
            if (j === i) {
                continue;
            }

            if (points[i][2] === points[j][2]) {
                // if points are from the same source, quit
                continue;
            }

            const distX = Math.max(points[i][0], points[j][0]) - Math.min(points[i][0], points[j][0]);
            const distY = Math.max(points[i][1], points[j][1]) - Math.min(points[i][1], points[j][1]);

            points.push([
                Math.min(points[i][0], points[j][0]) + distX / 2,
                Math.min(points[i][1], points[j][1]) + distY / 2,
            ]);
        }
    }

    // remove dupes
    const seen = new Set();
    points = points.filter((point) => {
        if (point[0] < 0 || point[1] < 0 || point[0] > width || point[1] > height) {
            return false;
        }

        const key = `${point[0]},${point[1]}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);

        return true;
    });

    console.error('loop done', points.length);

    allPoints = {
        points,
        lines,
    };

    return allPoints;
}

function getPointsFromPosition(position) {
    const key = `${position[0]},${position[1]}`;
    if (preComputedPoints[key]) {
        return preComputedPoints[key];
    }
    //console.log('begin get points', position);
    let { points, lines } = getAllPoints();

    // filter out points we can't see
    points = points.filter((point) => {
        if (point[0] === position[0] && point[1] === position[1]) {
            // if this point is our current position ignore it
            return false;
        }
        for (const line of lines) {
            const intersect = doLinesIntersect(
                [position[0], position[1]], [point[0], point[1]],
                [line[0], line[1]], [line[2], line[3]],
            );
            if (intersect) {
                return false;
            }
        }

        return true;
    }).map((point) => [...point]);

    //console.log('after filter', points.length);

    preComputedPoints[key] = points;

    return points;
}

function addToQueue(position, path) {
    // if we're already handling this point, don't bother to do it again
    for (const item of processed) {
        if (item[0] === position[0] && item[1] === position[1]) {
            //return;
        }
    }
    for (const item of path) {
        if (item[0] === position[0] && item[1] === position[1]) {
            return;
        }
    }

    //console.log(path);

    //const cost = getPathCost([...path, position]);
    // distance to the end
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

    //console.log('hanlding', position);

    let inserted = false;
    for (let i=0;i<queue.length;i++) {
        if (queue[i].path.length >= path.length && queue[i].cost > cost) {
            queue.splice(i, 0, newQueueObj);
            inserted = true;
            break;
        }
    }

    if (!inserted) {
        queue.push(newQueueObj);
    }
    processed.push([...position]);
}

function processQueue() {
    if (queue.length === 0) {
        return;
    }

    const queueItem = queue.shift();

    let pointsForPosition = getPointsFromPosition(queueItem.position);
        pointsForPosition = pointsForPosition.filter((point) => {
        for (const item of processed) {
            //console.log(point, item);
            if (item[0] === point[0] && item[1] === point[1]) {
                //console.log('matcing');
                //return false;
            }
        }
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
        const key = keyPoint(point);
        if (endPoints[key]) {
            validPaths.push([...path, position, point, end]);
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
    for (const path of validPaths) {
        const cost = getPathCost(path);
        const text = `Path of cost ${cost} - ${path.length} steps`;
        const holder = document.createElement("div");
        holder.textContent = text;

        holder.addEventListener("click", () => {
            selectedPath = path;
            draw();
        });

        pathList.appendChild(holder);

        if (count > 30) {
            break;
        }
        count ++;
    }
}

function update() {
    processQueue();

    renderPathList();

    selectedPath = null;

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
        ctx.fillStyle = "purple";
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

    if (selectedPath) {
        let last = null;
        for (const point of selectedPath) {
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

addToQueue(start, [], []);
preCompute();
update();
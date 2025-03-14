const canvas = document.getElementById("canvas");
const button = document.getElementById("step");
const pathList = document.getElementById("path_list");
const runButton = document.getElementById("run");

button.addEventListener('click', () => {
    update();
});

runButton.addEventListener('click', () => {
    let count = 0;
    while (queue.length > 0) {
        console.log(queue.length);
        processQueue();
        count ++;
        if (count > 1000) {
            break;
        }
    }

    renderPathList();

    draw();
});


const width = 500;
const height = 500;

const start = [40, 200];
let position = [...start];
const queue = [];
const end = [400, 50];
const walls = [
    [60, 0, 80, 300],
];
let points = [];
let path = [];
const validPaths = [];
let selectedPath = null;

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


// TODO: somehouw our seen filter does not work, points continue to increase in the queue
// even though after 1000 iterations we def should be through with all of them
function getPoints(position, seen) {
    //console.log('begin get points', position);
    let points = [];
    const lines = [];

    points.push([...end]);

    for (const wall of walls) {

        const cx = (Math.abs(wall[0] - wall[2]) / 2) + Math.min(wall[0], wall[2]);
        const cy = (Math.abs(wall[1] - wall[3]) / 2) + Math.min(wall[1], wall[3]);

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
            ]);

            points.push([
                point[0] + ux * 1,
                point[1],
            ]);

            points.push([
                point[0],
                point[1] + uy * 1,
            ]);
        }

        lines.push([wall[0], wall[1], wall[2], wall[1]]);
        lines.push([wall[2], wall[1], wall[2], wall[3]]);
        lines.push([wall[2], wall[3], wall[0], wall[3]]);
        lines.push([wall[0], wall[3], wall[0], wall[1]]);
    }
    
    // filter out points we can't see
    points = points.filter((point) => {
        if (point[0] < 0 || point[1] < 0 || point[0] > width || point[1] > height) {
            return false;
        }
        for (const item of seen) {
            if (item[0] === point[0] && item[1] === point[1]) {
                return false;
            }
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

        //console.log('we have not seen', seen, point);

        return true;
    });

    return points;
}

function addToQueue(position, path) {
    const pointsForPosition = getPoints(position, path);
    //const cost = getPathCost([...path, position]);
    const cost = Math.sqrt(Math.pow(position[0] - end[0], 2) + Math.pow(position[1] - end[1], 2));

    const newQueueObj = {
        position,
        points: pointsForPosition,
        path,
        cost,
    };

    let inserted = false;
    for (let i=0;i<queue.length;i++) {
        if (queue[i].cost > cost) {
            queue.splice(i, 0, newQueueObj);
            inserted = true;
            break;
        }
    }

    if (!inserted) {
        queue.push(newQueueObj);
    }
}

function processQueue() {
    if (queue.length === 0) {
        return;
    }

    const item = queue.shift();
    position = item.position;
    points = item.points;
    path = item.path;

    if (position[0] === end[0] && position[1] === end[1]) {
        // we found a valid path, no sense continuing down this section of the tree
        validPaths.push([...path, position]);
        return;
    }
   // console.log('procesing queue got points', points.length);
    for (const point of points) {
        addToQueue(point, [...path, position]);
    }
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

    for (const point of points) {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(point[0], point[1], 5, 0, 2*Math.PI);
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(position[0], position[1]);
        ctx.lineTo(point[0], point[1]);
        ctx.stroke();
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
        if (last) {
            ctx.strokeStyle = "#0f0";
            ctx.beginPath();
            ctx.moveTo(last[0], last[1]);
            ctx.lineTo(position[0], position[1]);
            ctx.stroke();
        }
    }

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, width, height);

    ctx.restore();
}

addToQueue(start, [], []);
update();
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
    while (los.getQueue().length > 0) {
        console.log(los.getQueue().length, count);
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

    console.log(los.getQueue());
});


const width = 500;
const height = 500;

const startPoint = [40, 200];
let position = [];
const end = [400, 50];
const walls = [
    [60, 0, 80, 300],
    [200,200, 300, 220],
    [89, 274, 176, 331],
];
let path = [];
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

function processQueue() {
    if (los.getQueue().length === 0) {
        return;
    }

    const queueItem = los.getQueue().shift();

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
    path = queueItem.path;

    //console.log('procesing queue got points', points.length);
    for (const point of pointsForPosition) {
        // is this point a point that can see the end?
        const key = Los.keyPoint(point);
        if (los.getEndPoints()[key]) {
            los.setValidPath([...path, position, ...los.getEndPoints()[key]]);
            continue;
        }

        //console.log('checking', point);
        los.addToQueue(point, [...path, position]);
    }
    //console.log('when done', queue.length, processed.length);
}

function renderPathList() {
    pathList.innerHTML = "";

    if (los.getValidPath()) {
        const cost = Los.getPathCost(los.getValidPath());
        const text = `Path of cost ${cost} - ${los.getValidPath().length} steps`;
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

    for (const point of los.getAllPoints().points) {
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

    if (los.getValidPath()) {
        let last = null;
        for (const point of los.getValidPath()) {
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
    path = [];
    allPoints = null;
    los = new Los(width, height, start, end, walls, overridePoints);

    los.addToQueue(startPoint, [], []);
    los.preCompute();
    update();
}

start();
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
        los.processQueue();
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
const end = [400, 50];
const walls = [
    [{x: 60, y: 0}, { x: 80, y: 0}, {x: 80, y: 300}, {x:60, y:300}],
    [{x: 200, y: 200}, { x: 300, y: 200 }, { x: 300, y: 220 }, { x: 200, y: 220 }],
    [{x: 89, y: 274}, {x: 176, y: 274}, {x: 176, y: 331} ,{x: 89, y: 331}],
    [{x: 131, y: 188 }, { x: 182, y: 235 }],
];
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
    los.processQueue();

    renderPathList();

    draw();
}

function draw() {
    const ctx = canvas.getContext("2d");
    ctx.save();

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#f00";
    ctx.beginPath();
    ctx.arc(startPoint[0], startPoint[1], 10, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(end[0], end[1], 10, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(los.getCurrentPosition()[0], los.getCurrentPosition()[1], 10, 0, 2*Math.PI);
    ctx.fill();

    for (const wall of walls) {
        ctx.fillStyle = "rgba(128, 0, 128, 0.5)";
        ctx.beginPath();
        ctx.moveTo(wall[0].x, wall[0].y);
        for (let i=1;i<wall.length;i++) {
            ctx.lineTo(wall[i].x, wall[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

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
            ctx.lineTo(los.getCurrentPosition()[0], los.getCurrentPosition()[1]);
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
    path = [];
    allPoints = null;
    los = new Los(width, height, start, end, walls, {
        overridePoints,
        maxDistToLine,
    });

    los.addToQueue(startPoint, [], []);
    los.preCompute();
    update();
}

start();